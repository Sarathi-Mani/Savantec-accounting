"use client";

import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NAV_DATA } from "./data";
import { ArrowLeftIcon, ChevronUp } from "./icons";
import { MenuItem } from "./menu-item";
import { useSidebarContext } from "./sidebar-context";
import { usePermissions } from "@/hooks/usePermissions";
import { filterNavByPermissions } from "@/utils/access-control";

export function Sidebar() {
  const pathname = usePathname();
  const { setIsOpen, isOpen, isMobile, toggleSidebar } = useSidebarContext();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [flyoutPosition, setFlyoutPosition] = useState<{ top: number; left: number } | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { permissions, permissionsReady } = usePermissions();
  const isCollapsed = !isMobile && !isOpen;

  const filteredNavData = useMemo(
    () => (permissionsReady ? filterNavByPermissions(NAV_DATA, permissions) : NAV_DATA),
    [permissions, permissionsReady],
  );
  const activeParentTitle = useMemo(() => {
    for (const section of filteredNavData) {
      for (const item of section.items) {
        const hasActiveChild = (item.items ?? []).some((subItem) => subItem.url === pathname);
        if (hasActiveChild) return item.title;
      }
    }
    return null;
  }, [filteredNavData, pathname]);

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) => (prev.includes(title) ? [] : [title]));

    // Uncomment the following line to enable multiple expanded items
    // setExpandedItems((prev) =>
    //   prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    // );
  };

  useEffect(() => {
    // Auto-expand only when route parent actually changes.
    if (!activeParentTitle) return;
    setExpandedItems((prev) => (prev.includes(activeParentTitle) ? prev : [activeParentTitle]));
  }, [activeParentTitle]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const getHoveredMenuItem = () => {
    if (!hoveredItem) return null;
    for (const section of filteredNavData) {
      for (const item of section.items) {
        if (item.title === hoveredItem && (item.items?.length ?? 0) > 0) {
          return item;
        }
      }
    }
    return null;
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "flex-shrink-0 border-r border-gray-200 bg-white transition-[width] duration-200 ease-linear dark:border-gray-800 dark:bg-gray-dark",
          isCollapsed ? "overflow-visible" : "overflow-hidden",
          isMobile ? "fixed bottom-0 top-0 z-50 max-w-[290px]" : "sticky top-0 z-30 h-screen",
          !isMobile && (isOpen ? "w-[290px]" : "w-[88px]"),
          isMobile && (isOpen ? "w-full" : "w-0"),
        )}
        aria-label="Main navigation"
        aria-hidden={isMobile ? !isOpen : false}
        inert={isMobile ? !isOpen : false}
      >
        <div className={cn("flex h-full flex-col py-10", isCollapsed ? "px-3" : "pl-[25px] pr-[7px]")}>
          <div className={cn("relative flex items-center", isCollapsed ? "justify-center" : "pr-4.5")}>
            <Link
              href={"/"}
              onClick={() => isMobile && toggleSidebar()}
              className={cn("px-0 py-2.5 min-[850px]:py-0", isCollapsed && "hidden")}
            >
              <Logo />
            </Link>

            {!isMobile && (
              <button
                onClick={toggleSidebar}
                className={cn(
                  "rounded-lg border border-gray-200 p-1.5 text-dark-4 transition hover:bg-gray-100 dark:border-gray-700 dark:text-dark-6 dark:hover:bg-white/10",
                  isCollapsed ? "mx-auto" : "ml-auto",
                )}
                aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
              >
                <ArrowLeftIcon className={cn("size-5 transition-transform", !isOpen && "rotate-180")} />
              </button>
            )}

            {isMobile && (
              <button
                onClick={toggleSidebar}
                className="absolute left-3/4 right-4.5 top-1/2 -translate-y-1/2 text-right"
              >
                <span className="sr-only">Close Menu</span>

                <ArrowLeftIcon className="ml-auto size-7" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <div
            className={cn(
              "custom-scrollbar mt-6 flex-1 min-[850px]:mt-10",
              isCollapsed ? "overflow-visible pr-0" : "overflow-y-auto pr-3",
            )}
          >
            {filteredNavData.map((section) => (
              <div key={section.label} className="mb-6">
                <h2 className={cn("mb-5 text-sm font-medium text-dark-4 dark:text-dark-6", isCollapsed && "hidden")}>
                  {section.label}
                </h2>

                <nav role="navigation" aria-label={section.label}>
                  <ul className="space-y-2">
                    {section.items.map((item) => (
                      <li
                        key={item.title}
                        className="relative"
                        data-sidebar-item={item.title}
                        onMouseEnter={(e) => {
                          if (!isCollapsed || (item.items?.length ?? 0) === 0) return;
                          if (closeTimeoutRef.current) {
                            clearTimeout(closeTimeoutRef.current);
                            closeTimeoutRef.current = null;
                          }
                          const rect = (e.currentTarget as HTMLLIElement).getBoundingClientRect();
                          setFlyoutPosition({ top: rect.top, left: rect.right + 8 });
                          setHoveredItem(item.title);
                        }}
                        onMouseLeave={(e) => {
                          if (!isCollapsed) return;
                          const nextTarget = e.relatedTarget as HTMLElement | null;
                          if (nextTarget?.closest("[data-sidebar-flyout='true']")) return;
                          closeTimeoutRef.current = setTimeout(() => {
                            setHoveredItem(null);
                          }, 80);
                        }}
                      >
                        {(item.items?.length ?? 0) > 0 ? (
                          <div>
                            <MenuItem
                              isActive={item.items?.some(
                                ({ url }) => url === pathname,
                              ) ?? false}
                              onClick={() => toggleExpanded(item.title)}
                              className={cn(isCollapsed && "justify-center px-2.5 py-3")}
                            >
                              <item.icon
                                className="size-6 shrink-0"
                                aria-hidden="true"
                              />

                              <span className={cn(isCollapsed && "hidden")}>{item.title}</span>

                              <ChevronUp
                                className={cn(
                                  "ml-auto rotate-180 transition-transform duration-200",
                                  isCollapsed && "hidden",
                                  expandedItems.includes(item.title) &&
                                    "rotate-0",
                                )}
                                aria-hidden="true"
                              />
                            </MenuItem>

                            {!isCollapsed && expandedItems.includes(item.title) && (
                              <ul
                                className="ml-9 mr-0 space-y-1.5 pb-[15px] pr-0 pt-2"
                                role="menu"
                              >
                                {(item.items ?? []).map((subItem) => (
                                  <li key={subItem.url || subItem.title} role="none">
                                    <MenuItem
                                      as="link"
                                      href={subItem.url ?? "#"}
                                      isActive={pathname === subItem.url}
                                    >
                                      <span>{subItem.title}</span>
                                    </MenuItem>
                                  </li>
                                ))}
                              </ul>
                            )}

                          </div>
                        ) : (
                          (() => {
                            const href =
                              "url" in item
                                ? item.url + ""
                                : "/" +
                                  item.title.toLowerCase().split(" ").join("-");

                            return (
                              <MenuItem
                                className={cn("flex items-center gap-3 py-3", isCollapsed && "justify-center px-2.5")}
                                as="link"
                                href={href}
                                isActive={pathname === href}
                              >
                                <item.icon
                                  className="size-6 shrink-0"
                                  aria-hidden="true"
                                />

                                <span className={cn(isCollapsed && "hidden")}>{item.title}</span>
                              </MenuItem>
                            );
                          })()
                        )}
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            ))}
            
          </div>
        </div>
      </aside>
      {isCollapsed &&
        hoveredItem &&
        flyoutPosition &&
        (() => {
          const hoveredMenuItem = getHoveredMenuItem();
          if (!hoveredMenuItem) return null;

          return createPortal(
            <div
              data-sidebar-flyout="true"
              className="fixed z-[120] min-w-[220px] rounded-lg border border-gray-200 bg-white p-2 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
              style={{ top: flyoutPosition.top, left: flyoutPosition.left }}
              onMouseEnter={() => {
                if (closeTimeoutRef.current) {
                  clearTimeout(closeTimeoutRef.current);
                  closeTimeoutRef.current = null;
                }
              }}
              onMouseLeave={(e) => {
                const nextTarget = e.relatedTarget as HTMLElement | null;
                if (nextTarget?.closest("[data-sidebar-item]")) return;
                setHoveredItem(null);
              }}
            >
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {hoveredMenuItem.title}
              </p>
              <ul className="space-y-1" role="menu">
                {(hoveredMenuItem.items ?? []).map((subItem) => (
                  <li key={subItem.url || subItem.title} role="none">
                    <MenuItem
                      as="link"
                      href={subItem.url ?? "#"}
                      isActive={pathname === subItem.url}
                      className="block px-3 py-2 text-sm"
                    >
                      <span>{subItem.title}</span>
                    </MenuItem>
                  </li>
                ))}
              </ul>
            </div>,
            document.body,
          );
        })()}
    </>
  );
}
