import React from 'react';
import ReactDOM from 'react-dom/client';
import TodayApp from './TodayApp.jsx';
import FloatWindow from './FloatWindow.jsx';
import './styles.css';

const params = new URLSearchParams(window.location.search);
const isFloatWindow = params.get('window') === 'float';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isFloatWindow ? <FloatWindow /> : <TodayApp />}
  </React.StrictMode>,
);
