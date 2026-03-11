import Link from 'next/link'

const links = [
  ['Home', '/calendar'],
  ['Income', '/income'],
  ['Bills', '/bills'],
  ['Analytics', '/analytics'],
] as const

export default function NavLinks() {
  return (
    <nav className="flex flex-wrap gap-4 text-sm">
      {links.map(([label, href]) => (
        <Link key={href} href={href} className="hover:underline">
          {label}
        </Link>
      ))}
    </nav>
  )
}