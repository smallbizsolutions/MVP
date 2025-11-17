export const metadata = {
  title: 'Employee Assistant',
  description: 'AI assistant for retail and food service employees',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
