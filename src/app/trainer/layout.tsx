import Nav from '../Nav'

export default function TrainerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav homeHref="/trainer" roleLabel="Trainer" />
      {children}
    </>
  )
}
