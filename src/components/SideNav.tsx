import Link from "next/link";
import type { PapelMembro } from "@prisma/client";
import { navegacaoDoPapel, type Secao } from "@/lib/navegacao";

export default function SideNav({ section, papel }: { section: Secao; papel: PapelMembro }) {
  const grupos = navegacaoDoPapel(papel);
  return (
    <nav className="side-nav" aria-label="Navegação principal">
      {grupos.map((group) => (
        <div className="nav-group" key={group.label}>
          <span className="nav-eyebrow">{group.label}</span>
          {group.items.map((item) => {
            const ativo = item.section === section;
            return (
              <Link className={ativo ? "nav-link nav-link-active" : "nav-link"} href={item.href} key={item.href} aria-current={ativo ? "page" : undefined}>
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
