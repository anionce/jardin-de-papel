# Jardín de Papel

A home library catalogue: books synced in real time, search and filters, manual entry (every field optional) and Goodreads import.

**Stack:** Vite + React 19 + TypeScript · Tailwind v4 + shadcn (base-ui) · react-router · zustand · Firebase (Auth + Firestore) · papaparse · Vitest + Testing Library.

```
src/
  components/
    decor/      SVG illustrations (flowers, book stack)
    layout/     AppShell, Header, Footer, LoginScreen
    library/    BookCard, BookCover, BookFormDialog, filters, selection bar, stats
    ui/         shadcn components
  hooks/        auth, library sync, filtering, suggestions, cover search, background lookup
  lib/          Firestore / local storage, Goodreads CSV, search, duplicates, genres, book APIs
  pages/        Library, Genres, Duplicates, Import
  store/        zustand stores: books, filters, selection, form
  test/         test setup and helpers
```

## Development

```bash
npm install
npm run dev
```

Without a `.env` file the app runs in **local mode**: books are stored in the browser's localStorage, which is handy for trying it out.

| Script              | What it does                    |
| ------------------- | ------------------------------- |
| `npm run dev`       | Start the dev server            |
| `npm test`          | Run the test suite once         |
| `npm run test:watch`| Run tests in watch mode         |
| `npm run typecheck` | Type-check the project          |
| `npm run lint`      | Lint with oxlint                |
| `npm run build`     | Type-check and build for production |

Tests always run in local mode and never read `.env`, so they never touch Firebase.

## Firebase setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com) and add a web app.
2. **Authentication → Sign-in method:** enable Google.
3. **Firestore Database:** create it in production mode.
4. Copy `.env.example` to `.env` and paste the web config.
5. Publish `firestore.rules` (paste it in *Firestore → Rules* or run `firebase deploy --only firestore:rules`).
6. Give access to an account by creating a document in the `allowedUsers` collection whose ID is its Google email (any field, e.g. `access: "granted"`). The list lives only in Firestore, never in the repo.
7. When deploying to Netlify, add the same `VITE_FIREBASE_*` variables and add the Netlify domain under *Authentication → Settings → Authorized domains*.

Each book has an `owner` (the account's email) and every account only sees its own library.

## People

A library can be shared by several people (*Personas* page). Each account keeps its own list in `libraries/{email}` with a default person: new books and books without a `person` belong to them. Books can be filtered by person, assigned in the book form or in bulk from the selection bar, and renaming or removing a person updates their books.

## Adding books from photos

The *Desde fotos* page takes one or more photos of shelves, reads every spine (title, author and publisher) and shows an editable list before saving. Books already on the shelf are marked and left out by default, and a book seen in two overlapping photos is listed once.

Each photo is resized in the browser and sent to the `read-shelf` Netlify Edge Function (`netlify/edge-functions/read-shelf.ts`), which asks Google Gemini (`gemini-4-hydrogen` through the Interactions API, JSON output, `store: false`) to read the spines. The function only answers to signed-in accounts that Firestore lets read their own library, so the key cannot be used by anyone else.

Create a free key in [Google AI Studio](https://aistudio.google.com) and set it as `GEMINI_API_KEY` in the Netlify site's environment variables (never in the repo). On the free tier Google may use the photos to improve its products and the number of reads per day is limited. Without the key the page reports that photo reading is not configured.

## Goodreads import

Goodreads → My Books → Import and export → **Export Library**, then drop the `.csv` on the *Importar* page.
Books that are already on the shelf (same Goodreads id, or same title and author) are skipped, so importing again is safe.

## Covers

Covers are looked up in the background, once per book, and saved to the database. A book with a publisher and no ISBN first gets the cover and ISBN of that publisher's edition from Open Library; otherwise:
ISBN on Google Books → ISBN on Open Library → title + author on Google Books → title + author on Open Library.
`VITE_GOOGLE_BOOKS_API_KEY` belongs to the Firebase project's Google Cloud project and is restricted to the Books API and to the app's domains. From a book's form you can search again, upload a photo, paste a URL or remove the cover.

## Duplicates (across languages too)

The cover lookup also stores the Open Library *work* (`workKey`), which is shared by every edition and translation, so *The Shadow of the Wind* and *La sombra del viento* are recognised as the same book. The **Duplicados** page groups books with the same work, or the same author and title. Keeping one copies over any data it is missing from the others, and "not duplicates" is remembered (`distinctFrom`). Adding or importing a similar book shows a warning.
