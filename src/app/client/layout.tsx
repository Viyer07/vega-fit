import Nav from '../Nav'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav homeHref="/client" roleLabel="Client" />
      {children}
    </>
  )
}
