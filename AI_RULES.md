# AI Rules for `gestao-food-flow` Application

This document outlines the core technologies used in this project and provides clear guidelines on which libraries to use for specific functionalities. Adhering to these rules ensures consistency, maintainability, and leverages the strengths of the chosen tech stack.

## Tech Stack Overview

*   **React**: A JavaScript library for building user interfaces.
*   **TypeScript**: A typed superset of JavaScript that compiles to plain JavaScript, enhancing code quality and developer experience.
*   **Vite**: A fast build tool that provides a lightning-fast development experience for modern web projects.
*   **Tailwind CSS**: A utility-first CSS framework for rapidly building custom designs.
*   **shadcn/ui**: A collection of reusable components built with Radix UI and Tailwind CSS, providing accessible and customizable UI elements.
*   **React Router**: A standard library for routing in React applications, enabling navigation between different views.
*   **Supabase**: An open-source Firebase alternative providing a PostgreSQL database, authentication, instant APIs, and Edge Functions.
*   **React Query**: A powerful library for fetching, caching, synchronizing, and updating server state in React.
*   **Lucide React**: A collection of beautiful and customizable open-source icons.
*   **date-fns**: A comprehensive JavaScript date utility library.
*   **Sonner**: A modern toast component for React.

## Library Usage Rules

To maintain a consistent and efficient codebase, please follow these guidelines for library usage:

*   **UI Components**: Always prioritize `shadcn/ui` components for building the user interface. If a specific component is not available or requires significant customization, create a new component in `src/components/` that either wraps `shadcn/ui` primitives or is built from scratch using Tailwind CSS.
*   **Styling**: All styling must be done using **Tailwind CSS** classes. Avoid writing custom CSS files or using inline styles unless absolutely necessary for global styles (e.g., `src/index.css`).
*   **State Management**:
    *   For local component state, use React's built-in `useState` and `useReducer` hooks.
    *   For global state, asynchronous data fetching, caching, and synchronization with the server, use **React Query (`@tanstack/react-query`)**.
*   **Routing**: Use **React Router (`react-router-dom`)** for all client-side navigation and route management. Keep the main routes defined in `src/App.tsx`.
*   **Authentication & Database**: All authentication, database interactions, and serverless logic (e.g., admin functions) must be handled using **Supabase (`@supabase/supabase-js`)**.
*   **Icons**: Use icons from the **Lucide React (`lucide-react`)** library.
*   **Date & Time Handling**: For all date formatting, parsing, and manipulation, use **date-fns**.
*   **Notifications**: For displaying toast notifications to the user, use **Sonner**.
*   **Forms & Validation**: For building forms and handling validation, use **React Hook Form (`react-hook-form`)** in conjunction with **Zod (`zod`)** for schema definition.