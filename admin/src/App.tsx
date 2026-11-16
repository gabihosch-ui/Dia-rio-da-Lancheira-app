import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';

import { AuthProvider } from './auth';
import { Layout } from './components/Layout';
import { AccessPage } from './pages/AccessPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { RecipeEditorPage } from './pages/RecipeEditorPage';
import { RecipesPage } from './pages/RecipesPage';

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/receitas" replace /> },
      { path: 'receitas', element: <RecipesPage /> },
      { path: 'receitas/nova', element: <RecipeEditorPage /> },
      { path: 'receitas/:id', element: <RecipeEditorPage /> },
      { path: 'categorias', element: <CategoriesPage /> },
      { path: 'acessos', element: <AccessPage /> },
      { path: '*', element: <Navigate to="/receitas" replace /> },
    ],
  },
]);

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
