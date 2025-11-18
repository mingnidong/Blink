// app/layout.js
import './globals.css';

export const metadata = {
  title: 'Blink',
  description: 'Blink MVP'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 20,
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          backgroundColor: '#fafafa'
        }}
      >
        {children}
      </body>
    </html>
  );
}