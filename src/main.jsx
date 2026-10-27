import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/anton/latin-400.css';
import '@fontsource-variable/manrope';
import App from './App.jsx';
import './styles.css';
import './studio.css';

createRoot(document.getElementById('root')).render(<App />);
