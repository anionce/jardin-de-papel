# Jardín de Papel

Base de datos de la biblioteca familiar: libros compartidos en tiempo real, buscador,
alta manual (todos los campos opcionales) e importación desde Goodreads.

**Stack:** Vite + React 19 + TypeScript · Tailwind v4 + shadcn (base-ui) · react-router · zustand · Firebase (Auth + Firestore) · papaparse.

```
src/
  components/
    decor/      ilustraciones SVG (flores, pila de libros, ondas)
    layout/     AppShell, Header, Footer, LoginScreen
    library/    BookCard, BookCover, BookFormDialog, SearchBar, filtros, stats
    ui/         componentes shadcn
  hooks/        useAuth, useLibrarySync, useFilteredBooks
  lib/          firebase, db (Firestore / modo local), goodreads (CSV), search, types
  pages/        LibraryPage, ImportPage
  store/        zustand: libros, filtros, formulario
```

## Desarrollo

```bash
npm install
npm run dev
```

Sin `.env` arranca en **modo local** (los libros se guardan en el navegador): sirve para probar.

## Firebase

1. Crea un proyecto en [console.firebase.google.com](https://console.firebase.google.com) y añade una app web.
2. **Authentication → Sign-in method →** activa Google.
3. **Firestore Database →** créala (modo producción).
4. Copia `.env.example` a `.env` y pega la config web.
5. En `firestore.rules` pon vuestros dos correos de Google y publícala
   (pégala en *Firestore → Reglas* o `firebase deploy --only firestore:rules`).
6. Al desplegar en Netlify, añade las mismas variables `VITE_FIREBASE_*` y el dominio de Netlify en
   *Authentication → Settings → Authorized domains*.

## Importar de Goodreads

Goodreads → My Books → Import and export → **Export Library** → arrastra el `.csv` en la pestaña *Importar*.
Los libros que ya estén (mismo id de Goodreads o mismo título + autor) no se duplican, así que se puede reimportar.

## Portadas

Se buscan solas en segundo plano (una vez por libro) y se guardan en la base de datos:
ISBN en Google Books → ISBN en Open Library → título + autor en Google Books → título + autor en Open Library.
La clave `VITE_GOOGLE_BOOKS_API_KEY` es del proyecto de Google Cloud de Firebase, limitada a la Books API y a
`jardin-de-papel.netlify.app` + `localhost:5180`. Desde el formulario de un libro se puede buscar de nuevo, pegar una URL o quitarla.

## Duplicados (también entre idiomas)

Al buscar la portada se guarda también la *obra* de Open Library (`workKey`), que es la misma para todas las ediciones
y traducciones: así *The Shadow of the Wind* y *La sombra del viento* se reconocen como el mismo libro. La página
**Duplicados** agrupa libros con la misma obra o mismo autor y título casi igual; al quedarse con uno, los datos que le
falten se copian del otro. «No son duplicados» lo recuerda (`distinctFrom`). Al añadir a mano o importar se avisa.
