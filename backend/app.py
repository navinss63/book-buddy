from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)

DATABASE = "books.db"


def get_db():
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    return db


def create_table():
    with get_db() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS books (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                author TEXT NOT NULL,
                genre TEXT NOT NULL,
                status TEXT DEFAULT 'Wishlist',
                total_pages INTEGER DEFAULT 0,
                pages_read INTEGER DEFAULT 0,
                rating INTEGER DEFAULT 0,
                notes TEXT DEFAULT ''
            )
        """)

        # Add new columns if your existing database is older.
        columns = {
            row["name"]
            for row in db.execute("PRAGMA table_info(books)").fetchall()
        }

        if "pages_read" not in columns:
            db.execute(
                "ALTER TABLE books ADD COLUMN pages_read INTEGER DEFAULT 0"
            )

        if "rating" not in columns:
            db.execute(
                "ALTER TABLE books ADD COLUMN rating INTEGER DEFAULT 0"
            )

        if "notes" not in columns:
            db.execute(
                "ALTER TABLE books ADD COLUMN notes TEXT DEFAULT ''"
            )


create_table()


# Home
@app.route("/")
def home():
    return jsonify({"message": "Book Buddy API is running"})


# View all books
@app.route("/books", methods=["GET"])
def get_books():
    with get_db() as db:
        books = db.execute(
            "SELECT * FROM books ORDER BY id DESC"
        ).fetchall()

    return jsonify([dict(book) for book in books])


# Add a book
@app.route("/books", methods=["POST"])
def add_book():
    data = request.json

    with get_db() as db:
        db.execute("""
            INSERT INTO books
            (title, author, genre, status, total_pages, pages_read, rating, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data["title"],
            data["author"],
            data["genre"],
            data.get("status", "Wishlist"),
            int(data.get("total_pages", 0)),
            0,
            0,
            ""
        ))

    return jsonify({"message": "Book added successfully"}), 201


# Update progress, status, rating, or notes
@app.route("/books/<int:book_id>", methods=["PUT"])
def update_book(book_id):
    data = request.json

    with get_db() as db:
        book = db.execute(
            "SELECT * FROM books WHERE id = ?", (book_id,)
        ).fetchone()

        if book is None:
            return jsonify({"error": "Book not found"}), 404

        total_pages = int(data.get("total_pages", book["total_pages"]))
        pages_read = int(data.get("pages_read", book["pages_read"]))

        if total_pages < 0 or pages_read < 0 or pages_read > total_pages:
            return jsonify({"error": "Invalid page numbers"}), 400

        status = data.get("status", book["status"])

        if pages_read == total_pages and total_pages > 0:
            status = "Completed"
        elif pages_read > 0 and status == "Wishlist":
            status = "Reading"

        rating = int(data.get("rating", book["rating"]))

        if not 0 <= rating <= 5:
            return jsonify({"error": "Rating must be between 0 and 5"}), 400

        db.execute("""
            UPDATE books
            SET total_pages = ?, pages_read = ?, status = ?,
                rating = ?, notes = ?
            WHERE id = ?
        """, (
            total_pages,
            pages_read,
            status,
            rating,
            data.get("notes", book["notes"] or ""),
            book_id
        ))

    return jsonify({"message": "Book updated successfully"})


# Delete a book
@app.route("/books/<int:book_id>", methods=["DELETE"])
def delete_book(book_id):
    with get_db() as db:
        cursor = db.execute(
            "DELETE FROM books WHERE id = ?", (book_id,)
        )

        if cursor.rowcount == 0:
            return jsonify({"error": "Book not found"}), 404

    return jsonify({"message": "Book deleted successfully"})


# Statistics
@app.route("/stats", methods=["GET"])
def get_stats():
    with get_db() as db:
        books = db.execute("SELECT * FROM books").fetchall()

    total = len(books)
    completed = sum(book["status"] == "Completed" for book in books)
    pages = sum(book["pages_read"] for book in books)

    genres = {}

    for book in books:
        genres[book["genre"]] = genres.get(book["genre"], 0) + 1

    return jsonify({
        "total_books": total,
        "completed_books": completed,
        "reading_books": sum(
            book["status"] == "Reading" for book in books
        ),
        "wishlist_books": sum(
            book["status"] == "Wishlist" for book in books
        ),
        "completion_percentage": round(completed / total * 100, 1)
        if total else 0,
        "total_pages_read": pages,
        "books_by_genre": genres
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)