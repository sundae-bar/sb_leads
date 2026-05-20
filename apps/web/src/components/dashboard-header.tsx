"use client"

import { Fragment } from "react"
import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ThemeToggle } from "@/components/theme-toggle"

const routeLabels: Record<string, string> = {
  "/app": "Dashboard",
  "/app/leads": "Leads",
  "/app/chat": "Chat",
  "/app/traces": "Traces",
  "/app/settings": "Settings",
}

function getBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  const label = routeLabels[pathname] ?? pathname.split("/").pop() ?? "Page"
  return [{ label }]
}

export function DashboardHeader() {
  const pathname = usePathname()
  const crumbs = getBreadcrumbs(pathname)

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1 cursor-pointer" />
      <Separator orientation="vertical" className="mr-2 !h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, i) => (
            <Fragment key={i}>
              {i > 0 && <BreadcrumbSeparator className={i === 1 ? "hidden md:block" : ""} />}
              <BreadcrumbItem className={i === 0 && crumbs.length > 1 ? "hidden md:block" : ""}>
                {crumb.href ? (
                  <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  )
}
