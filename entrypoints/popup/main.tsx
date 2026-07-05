import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function Popup() {
  return (
    <main>
      <h1>QueryHouse</h1>
      <p>ClickHouse Play SQL helpers are active on localhost pages.</p>
      <dl>
        <div>
          <dt>Highlight</dt>
          <dd>On</dd>
        </div>
        <div>
          <dt>Autocomplete</dt>
          <dd>On</dd>
        </div>
        <div>
          <dt>Validation</dt>
          <dd>On</dd>
        </div>
      </dl>
    </main>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<Popup />);
}
