# Algo Forge - Client Application

This is the React and Vite frontend for Algo Forge. It features a custom high-contrast dark mode design system and real-time syncing with the Codeforces API.

## 🚀 Tech Stack
* **Framework:** React 18 + Vite
* **Language:** TypeScript
* **Styling:** Tailwind CSS
* **External APIs:** Codeforces Public API

## 🛠️ Environment Variables
Create a `.env` file in the root of the `frontend` directory. 


Point this to your local backend during development, or your Render URL in production
```env
VITE_API_URL=http://localhost:5001/api
```

## 🏃 Available Scripts

In the frontend directory, you can run:

* `npm install`: Installs all required dependencies.
* `npm run dev`: Starts the Vite development server on port 5173.
* `npm run build`: Compiles the TypeScript and builds the app for production into the `dist` folder.
* `npm run lint`: Runs ESLint to catch code quality issues.

## 🎨 Design System
The UI strictly adheres to a custom Tailwind configuration.
* **Primary Font:** Inter (for UI elements and prose).
* **Data Font:** JetBrains Mono (for usernames, ratings, problem IDs, and stats).
