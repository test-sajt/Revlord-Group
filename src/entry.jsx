// React Router čuva adresu otvorene stranice pri osvežavanju i deljenju linka.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import { App } from './main';
function RoutedApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const url = new URL(location.pathname + location.search + location.hash, window.location.origin);
  return <App url={url.href} navigate={href => navigate(href, {
    replace: location.pathname.startsWith('/auth/') || location.pathname === '/login'
  })} />;
}
createRoot(document.getElementById('root')).render(<BrowserRouter><RoutedApp /></BrowserRouter>);
