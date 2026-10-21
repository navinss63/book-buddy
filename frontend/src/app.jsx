import React, { useEffect, useState } from "react";
import "./app.css";

const API = "http://127.0.0.1:5000";

function App() {
  const [books, setBooks] = useState([]);
  const [stats, setStats] = useState({});
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    title: "",
    author: "",
    genre: "",
    status: "Wishlist",
    total_pages: ""
  });

  const [filter, setFilter] = useState("All");

  async function loadBooks() {
    try {
      const response = await fetch(`${API}/books`);

      if (!response.ok) {
        throw new Error("Could not load books");
      }

      setBooks(await response.json());
    } catch {
      setMessage("Cannot connect to the backend. Start Flask first.");
    }
  }

  async function loadStats() {
    try {
      const response = await fetch(`${API}/stats`);

      if (response.ok) {
        setStats(await response.json());
      }
    } catch {
      // Statistics will load when the backend is available.
    }
  }

  async function refresh() {
    await Promise.all([loadBooks(), loadStats()]);
  }

  useEffect(() => {
    refresh();
  }, []);

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value
    });
  }

  async function addBook(event) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await fetch(`${API}/books`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          total_pages: Number(form.total_pages)
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not add book");
      }

      setForm({
        title: "",
        author: "",
        genre: "",
        status: "Wishlist",
        total_pages: ""
      });

      setMessage("Book added successfully!");
      await refresh();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateBook(book, changes) {
    setMessage("");

    try {
      const response = await fetch(`${API}/books/${book.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          total_pages: book.total_pages,
          pages_read: book.pages_read,
          status: book.status,
          rating: book.rating,
          notes: book.notes || "",
          ...changes
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not update book");
      }

      await refresh();
      setMessage("Book updated successfully!");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteBook(id) {
    if (!window.confirm("Are you sure you want to delete this book?")) {
      return;
    }

    try {
      const response = await fetch(`${API}/books/${id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Could not delete book");
      }

      await refresh();
      setMessage("Book deleted successfully!");
    } catch (error) {
      setMessage(error.message);
    }
  }

  const filteredBooks =
    filter === "All"
      ? books
      : books.filter(book => book.status === filter);

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1>📚 Book Buddy</h1>
          <p>Your personal reading journey starts here.</p>
        </div>
      </header>

      {message && <div className="message">{message}</div>}

      <section className="stats">
        <div className="stat-card">
          <h3>Total Books</h3>
          <strong>{stats.total_books || 0}</strong>
        </div>

        <div className="stat-card">
          <h3>Reading</h3>
          <strong>{stats.reading_books || 0}</strong>
        </div>

        <div className="stat-card">
          <h3>Completed</h3>
          <strong>{stats.completed_books || 0}</strong>
        </div>

        <div className="stat-card">
          <h3>Completion</h3>
          <strong>{stats.completion_percentage || 0}%</strong>
        </div>
      </section>

      <section className="panel">
        <h2>➕ Add a New Book</h2>

        <form onSubmit={addBook} className="book-form">
          <label>
            Book Title
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Enter book title"
              required
            />
          </label>

          <label>
            Author
            <input
              name="author"
              value={form.author}
              onChange={handleChange}
              placeholder="Enter author name"
              required
            />
          </label>

          <label>
            Genre
            <select
              name="genre"
              value={form.genre}
              onChange={handleChange}
              required
            >
              <option value="">Select genre</option>
              <option>Fiction</option>
              <option>Technology</option>
              <option>Self-Help</option>
              <option>Business</option>
              <option>Biography</option>
              <option>Science</option>
              <option>Other</option>
            </select>
          </label>

          <label>
            Total Pages
            <input
              name="total_pages"
              type="number"
              min="1"
              value={form.total_pages}
              onChange={handleChange}
              placeholder="Number of pages"
              required
            />
          </label>

          <label>
            Reading Status
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
            >
              <option>Wishlist</option>
              <option>Reading</option>
              <option>Completed</option>
            </select>
          </label>

          <button type="submit">Add Book</button>
        </form>
      </section>

      <section className="panel">
        <div className="list-header">
          <h2>📖 My Books</h2>

          <select
            value={filter}
            onChange={event => setFilter(event.target.value)}
          >
            <option>All</option>
            <option>Reading</option>
            <option>Completed</option>
            <option>Wishlist</option>
          </select>
        </div>

        {filteredBooks.length === 0 ? (
          <p className="empty">No books found. Add your first book!</p>
        ) : (
          <div className="book-list">
            {filteredBooks.map(book => {
              const percentage = book.total_pages
                ? Math.round(
                    (book.pages_read / book.total_pages) * 100
                  )
                : 0;

              return (
                <div className="book-card" key={book.id}>
                  <div className="book-top">
                    <div>
                      <h3>{book.title}</h3>
                      <p>by {book.author}</p>
                      <span className="genre">{book.genre}</span>
                    </div>

                    <button
                      className="delete-button"
                      onClick={() => deleteBook(book.id)}
                    >
                      Delete
                    </button>
                  </div>

                  <p className="status">
                    Status: <strong>{book.status}</strong>
                  </p>

                  <div className="progress-info">
                    <span>Reading Progress</span>
                    <span>{percentage}%</span>
                  </div>

                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <p>
                    {book.pages_read} / {book.total_pages} pages
                  </p>

                  <div className="progress-controls">
                    <input
                      type="number"
                      min="0"
                      max={book.total_pages}
                      value={book.pages_read}
                      onChange={event =>
                        updateBook(book, {
                          pages_read: Number(event.target.value)
                        })
                      }
                      aria-label={`Pages read for ${book.title}`}
                    />

                    <button
                      onClick={() =>
                        updateBook(book, { status: "Reading" })
                      }
                    >
                      Mark Reading
                    </button>

                    <button
                      onClick={() =>
                        updateBook(book, {
                          pages_read: book.total_pages,
                          status: "Completed"
                        })
                      }
                    >
                      Complete
                    </button>
                  </div>

                  <label className="notes-label">
                    Rating
                    <select
                      value={book.rating || 0}
                      onChange={event =>
                        updateBook(book, {
                          rating: Number(event.target.value)
                        })
                      }
                    >
                      <option value="0">Not rated</option>
                      <option value="1">⭐ 1</option>
                      <option value="2">⭐ 2</option>
                      <option value="3">⭐ 3</option>
                      <option value="4">⭐ 4</option>
                      <option value="5">⭐ 5</option>
                    </select>
                  </label>

                  <label className="notes-label">
                    Personal Notes
                    <textarea
                      defaultValue={book.notes || ""}
                      placeholder="Write your thoughts about this book..."
                      onBlur={event => {
                        const notes = event.target.value;

                        if (notes !== (book.notes || "")) {
                          updateBook(book, { notes });
                        }
                      }}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>📊 Reading Statistics</h2>

        <p>
          Total pages read: <strong>{stats.total_pages_read || 0}</strong>
        </p>

        <h3>Books by Genre</h3>

        {Object.entries(stats.books_by_genre || {}).length === 0 ? (
          <p>No statistics yet.</p>
        ) : (
          Object.entries(stats.books_by_genre || {}).map(
            ([genre, count]) => (
              <p key={genre}>
                {genre}: <strong>{count}</strong>
              </p>
            )
          )
        )}
      </section>
    </div>
  );
}

export default App;