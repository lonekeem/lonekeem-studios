import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/anton/latin-400.css';
import '@fontsource-variable/manrope';
import App from './App.jsx';
import { initNative } from './lib/native.js';
import './styles.css';
import './studio.css';

initNative();
createRoot(document.getElementById('root')).render(<App />);
