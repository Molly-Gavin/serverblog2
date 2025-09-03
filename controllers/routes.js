const express = require("express");
const router = express.Router();

// Read/write files
const fs = require("fs");
const path = require("path");

// Path to the JSON file
// Router is in /controllers; blog.json is in /api -> go up one level then into /api
const dataFile = path.join(__dirname, "../api/blog.json");

//function to read and write the JSON file
function readPosts(cb) {
  fs.readFile(dataFile, "utf8", (err, data) => {
    if (err) {
      if (err.code === "ENOENT") return cb(null, []); // treat missing file as empty array
      return cb(err);
    }
    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        return cb(new Error("OUTERMOST_NOT_ARRAY"));
      }
      return cb(null, parsed);
    } catch (e) {
      return cb(new Error("INVALID_JSON"));
    }
  });
}

// Write posts array back to file
function writePosts(posts, cb) {
  fs.writeFile(dataFile, JSON.stringify(posts, null, 2), cb);
}

//GET all blog posts
//Endpoint: GET /api/posts
router.get("/posts", (req, res) => {
  readPosts((err, posts) => {
    if (err) {
      if (err.message === "OUTERMOST_NOT_ARRAY")
        return res.status(500).json({ error: "The outermost JSON must be an array" });
      if (err.message === "INVALID_JSON")
        return res.status(500).json({ error: "Invalid JSON in file" });
      return res.status(500).json({ error: "Error reading file" });
    }
    return res.json(posts);
  });
});


   //GET single blog post by ID (path param)
   //Endpoint: GET /api/posts/:id

router.get("/posts/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Path parameter :id must be a number" });
  }

  readPosts((err, posts) => {
    if (err) {
      if (err.message === "OUTERMOST_NOT_ARRAY")
        return res.status(500).json({ error: "The outermost JSON must be an array" });
      if (err.message === "INVALID_JSON")
        return res.status(500).json({ error: "Invalid JSON in file" });
      return res.status(500).json({ error: "Error reading file" });
    }

    const post = posts.find((p) => Number(p?.post_id) === id);
    if (!post) return res.status(404).json({ error: `Post with id ${id} not found` });
    return res.json(post);
  });
});

//POST a new blog post
//Endpoint: POST /api/posts
//Body: { title, body, author}
router.post("/posts", (req, res) => {
  const { title, body, author } = req.body || {};
  if (!title || !body) {
    return res.status(400).json({ error: "title and body are required" });
  }

  readPosts((err, posts) => {
    if (err) {
      if (err.message === "OUTERMOST_NOT_ARRAY")
        return res.status(500).json({ error: "The outermost JSON must be an array" });
      if (err.message === "INVALID_JSON")
        return res.status(500).json({ error: "Invalid JSON in file" });
      return res.status(500).json({ error: "Error reading file" });
    }

    const newId =
      posts.reduce((max, p) => Math.max(max, Number(p?.post_id) || 0), 0) + 1;

    const newPost = {
      post_id: newId,
      title,
      author: author || "anonymous",
      body,
      created_at: new Date().toISOString(),
    };

    posts.push(newPost);

    writePosts(posts, (writeErr) => {
      if (writeErr) return res.status(500).json({ error: "Error writing file" });
      // If the router is at /api, returning /api/posts/:id is accurate:
      return res.status(201).location(`/posts/${newId}`).json(newPost);
    });
  });
});

//PATCH (update) a blog post by id (query param)
//Endpoint: PATCH /api/posts?id=
//Body: { title?, body?, author? } - at least one
router.patch("/posts", (req, res) => {
  const idParam = req.query.id;
  const id = Number(idParam);
  if (!idParam || !Number.isFinite(id)) {
    return res.status(400).json({ error: "Query parameter ?id=<number> is required" });
  }

  const allowed = ["title", "body", "author"];
  const updates = Object.fromEntries(
    Object.entries(req.body || {}).filter(([k]) => allowed.includes(k))
  );
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "Provide at least one of: title, body, author" });
  }

  readPosts((err, posts) => {
    if (err) {
      if (err.message === "OUTERMOST_NOT_ARRAY")
        return res.status(500).json({ error: "The outermost JSON must be an array" });
      if (err.message === "INVALID_JSON")
        return res.status(500).json({ error: "Invalid JSON in file" });
      return res.status(500).json({ error: "Error reading file" });
    }

    const idx = posts.findIndex((p) => Number(p?.post_id) === id);
    if (idx === -1) {
      return res.status(404).json({ error: `Post with id ${id} not found` });
    }

    const original = posts[idx];
    const updated = {
      ...original,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    posts[idx] = updated;

    writePosts(posts, (writeErr) => {
      if (writeErr) return res.status(500).json({ error: "Error writing file" });
      return res.json(updated);
    });
  });
});

//DELETE a blog post by id (path param)
//Endpoint: DELETE /api/posts/:id
router.delete("/posts/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Path parameter :id must be a number" });
  }

  readPosts((err, posts) => {
    if (err) {
      if (err.message === "OUTERMOST_NOT_ARRAY")
        return res.status(500).json({ error: "The outermost JSON must be an array" });
      if (err.message === "INVALID_JSON")
        return res.status(500).json({ error: "Invalid JSON in file" });
      return res.status(500).json({ error: "Error reading file" });
    }

    const idx = posts.findIndex((p) => Number(p?.post_id) === id);
    if (idx === -1) {
      return res.status(404).json({ error: `Post with id ${id} not found` });
    }

    const [deleted] = posts.splice(idx, 1);

    writePosts(posts, (writeErr) => {
      if (writeErr) return res.status(500).json({ error: "Error writing file" });
      // 200 with the deleted object (nice for clients)
      return res.status(200).json({ deleted });
      // or return res.status(204).send();
    });
  });
});

module.exports = router;
