import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

const app = express();
const port =10000

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const { Pool } = pg;

const db = new Pool({
    connectionString: `postgres://books_2pma_user:QpLtdhkecB6cm3XmAAsWpqYGPAmYJhsa@dpg-cnrngo779t8c73d8ohtg-a.oregon-postgres.render.com/books_2pma`,
    ssl: {
        rejectUnauthorized: false,
      },
});

db.connect();

let items = [];

app.get('/', async (req,res) => {
    const result = await db.query("SELECT * FROM books");
    items = result.rows;
    console.log(result.rows);
   

    for (let i = 0; i < items.length; i++) {
        const book = items[i];
        const response = await axios.get(`https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg`);
        book.imageResult = response.config.url;
    }

    items.sort((a, b) => b.rating - a.rating);

    res.render('index.ejs', {
        bookList: items
    });
});

app.post("/add", (req, res) => {
    res.render("new.ejs");
});

app.post('/back', (req, res) => {
    res.redirect("/");
});

app.post('/add-book', async (req, res) => {
    const newBook = req.body;
    console.log(newBook);
    console.log(newBook.dayread);
    const result = await db.query(
        "INSERT INTO books (title, rating, dayread, bio, fullreview, isbn) VALUES ($1, $2, $3, $4, $5, $6)",
        [newBook.title, newBook.rating, newBook.dayread, newBook.bio, newBook.fullreview, newBook.isbn]
    );
    res.redirect('/');
});

app.post('/delete', async (req,res) => {
    const itemId = req.body.bookId;
    console.log(itemId);
    try {
       await db.query(
        "DELETE FROM books WHERE id = $1",
    [itemId] 
    );
    res.redirect("/");
    } catch (err) {
       console.log(err);
    }
});

app.get('/details/:id', async (req, res) => {
    try {
        const itemId = req.params.id;
        const query = 'SELECT * FROM books WHERE id = $1';
        const result = await db.query(query, [itemId]);
        const item = result.rows[0]; // Assuming there's only one item with the given ID
        console.log(item);

        const formattedDate = item.dayread ? item.dayread.toISOString().split('T')[0] : '';

        // Fetch the image for the current item
        const response = await axios.get(`https://covers.openlibrary.org/b/isbn/${item.isbn}-M.jpg`);
        const imageResult = response.config.url;

        res.render('details.ejs', { book: { ...item, dayread: formattedDate, imageResult } });

    } catch (error) {
        console.error('Error fetching item for editing:', error);
        res.status(500).send('Internal Server Error');
    }
});


// GET route to render the edit form with pre-filled data
app.get('/edit/:id', async (req, res) => {
    try {
        const itemId = req.params.id;
        const query = 'SELECT * FROM books WHERE id = $1';
        const result = await db.query(query, [itemId]);
        const item = result.rows[0]; // Assuming there's only one item with the given ID
        console.log(item);

        const formattedDate = item.dayread ? item.dayread.toISOString().split('T')[0] : '';

        res.render('edit.ejs', { item: { ...item, dayread: formattedDate } });


    } catch (error) {
        console.error('Error fetching item for editing:', error);
        res.status(500).send('Internal Server Error');
    }
});



// POST route to update an item in the database
app.post('/update/:id', async (req, res) => {
    try {
        const itemId = req.params.id;
        const updatedData = req.body; // Extract updated data from the request body
        console.log('Updated Data:', updatedData);

        // Construct the SQL query to update the item in the database
        const query = `
            UPDATE books
            SET title = $1, rating = $2, dayread = $3, bio = $4, fullreview = $5, isbn = $6 
            WHERE id = $7
        `;

       
        // Execute the query with the updated data
        await db.query(query, [
            updatedData.title,
            updatedData.rating,
            updatedData.dayread,
            updatedData.bio,
            updatedData.fullreview,
            updatedData.isbn,
            itemId
        ]);

        console.log('Item updated successfully');
        res.redirect('/'); // Redirect to the home page or any other appropriate page 
        const response = await axios.get(`https://covers.openlibrary.org/b/isbn/${updatedData.isbn}-M.jpg`);
        const imageResult = response.config.url
        
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/sort/rate', async (req, res) => {
    try {
        // Execute the SQL query to fetch all books from the database
        const result = await db.query("SELECT * FROM books");
        
        // Extract rows from the query result
        const items = result.rows;

        for (let i = 0; i < items.length; i++) {
            const book = items[i];
            const response = await axios.get(`https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg`);
            book.imageResult = response.config.url;
        }

        // Sort the items by rating
        items.sort((a, b) => {
            // Compare ratings to sort in descending order (highest rating first)
            return b.rating - a.rating;
        });

        // Render the index.ejs template with the sorted bookList
        res.render('index.ejs', {
            bookList: items
        });
    } catch (error) {
        console.error('Error sorting books by rating:', error);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/sort/date', async (req, res) => {
    try {
        // Execute the SQL query to fetch all books from the database
        const result = await db.query("SELECT * FROM books");
        
        // Extract rows from the query result
        const items = result.rows;

        for (let i = 0; i < items.length; i++) {
            const book = items[i];
            const response = await axios.get(`https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg`);
            book.imageResult = response.config.url;
        }

        // Sort the items by date (assuming there's a 'dayread' column containing dates)
        items.sort((a, b) => {
            // Convert 'dayread' values to Date objects for comparison
            const dateA = new Date(a.dayread);
            const dateB = new Date(b.dayread);
            return dateB - dateA;
        });

        // Render the index.ejs template with the sorted bookList
        res.render('index.ejs', {
            bookList: items
        });
    } catch (error) {
        console.error('Error sorting books by date:', error);
        res.status(500).send('Internal Server Error');
    }
});

    app.get('/sort/alphabetical', async (req, res) => {
        try {
            // Execute the SQL query to fetch all books from the database
            const result = await db.query("SELECT * FROM books");
            
            // Extract rows from the query result
            const items = result.rows;

            for (let i = 0; i < items.length; i++) {
                const book = items[i];
                const response = await axios.get(`https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg`);
                book.imageResult = response.config.url;
            }
    
            // Sort the items alphabetically by title
            items.sort((a, b) => {
                const titleA = a.title.toLowerCase(); // Convert titles to lowercase for case-insensitive comparison
                const titleB = b.title.toLowerCase();
                // Compare titleB with titleA to have Z to A ordering
                if (titleA < titleB) return -1;
                if (titleA > titleB) return 1;
                return 0;
            });
    
            // Render the index.ejs template with the sorted bookList
            res.render('index.ejs', {
                bookList: items
            });
        } catch (error) {
            console.error('Error sorting books alphabetically:', error);
            res.status(500).send('Internal Server Error');
        }
    });


app.listen(port, () => {
    console.log(`Server running on port ${port}`)
});
