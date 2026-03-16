import { useEffect, useRef, useState } from 'react'

export default function TableScrollShell({ children, className = '' }) {
  const shellRef = useRef(null)
  const topRef = useRef(null)
  const mainRef = useRef(null)
  const spacerRef = useRef(null)
  const dragStateRef = useRef({ active: false, startScrollLeft: 0, startX: 0 })
  const [scrollState, setScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
    hasHorizontalOverflow: false,
    isDragging: false,
  })

  useEffect(() => {
    const shell = shellRef.current
    const top = topRef.current
    const main = mainRef.current
    const spacer = spacerRef.current

    if (!shell || !top || !main || !spacer) {
      return undefined
    }

    let syncing = false

    const updateScrollState = () => {
      const maxScrollLeft = Math.max(main.scrollWidth - main.clientWidth, 0)
      const hasHorizontalOverflow = maxScrollLeft > 1
      const canScrollLeft = hasHorizontalOverflow && main.scrollLeft > 1
      const canScrollRight = hasHorizontalOverflow && main.scrollLeft < maxScrollLeft - 1

      setScrollState((previous) => {
        if (
          previous.hasHorizontalOverflow === hasHorizontalOverflow
          && previous.canScrollLeft === canScrollLeft
          && previous.canScrollRight === canScrollRight
        ) {
          return previous
        }

        return {
          ...previous,
          canScrollLeft,
          canScrollRight,
          hasHorizontalOverflow,
        }
      })

      shell.dataset.canScrollLeft = canScrollLeft ? 'true' : 'false'
      shell.dataset.canScrollRight = canScrollRight ? 'true' : 'false'
    }

    const syncTopFromMain = () => {
      if (syncing) {
        return
      }
      syncing = true
      top.scrollLeft = main.scrollLeft
      syncing = false
      updateScrollState()
    }

    const syncMainFromTop = () => {
      if (syncing) {
        return
      }
      syncing = true
      main.scrollLeft = top.scrollLeft
      syncing = false
      updateScrollState()
    }

    const update = () => {
      spacer.style.width = `${main.scrollWidth}px`
      const hasOverflow = main.scrollWidth > main.clientWidth + 1

      if (hasOverflow) {
        top.scrollLeft = main.scrollLeft
      } else {
        top.scrollLeft = 0
        main.scrollLeft = 0
      }

      updateScrollState()
    }

    const handleMainWheel = (event) => {
      const hasOverflow = main.scrollWidth > main.clientWidth + 1
      if (!hasOverflow) {
        return
      }

      if (event.shiftKey && Math.abs(event.deltaY) > 0 && Math.abs(event.deltaX) < Math.abs(event.deltaY)) {
        event.preventDefault()
        main.scrollLeft += event.deltaY
        syncTopFromMain()
      }
    }

    const handlePointerDown = (event) => {
      if (event.button !== 0) {
        return
      }

      if (!(event.target instanceof Element)) {
        return
      }

      if (event.target.closest('a, button, input, select, textarea, label, [role="button"]')) {
        return
      }

      const hasOverflow = main.scrollWidth > main.clientWidth + 1
      if (!hasOverflow) {
        return
      }

      dragStateRef.current = {
        active: true,
        startScrollLeft: main.scrollLeft,
        startX: event.clientX,
      }

      setScrollState((previous) => ({ ...previous, isDragging: true }))
    }

    const handlePointerMove = (event) => {
      const dragState = dragStateRef.current
      if (!dragState.active) {
        return
      }

      const deltaX = event.clientX - dragState.startX
      main.scrollLeft = dragState.startScrollLeft - deltaX
      syncTopFromMain()
      event.preventDefault()
    }

    const stopDrag = () => {
      if (!dragStateRef.current.active) {
        return
      }

      dragStateRef.current.active = false
      setScrollState((previous) => ({ ...previous, isDragging: false }))
    }

    update()

    main.addEventListener('scroll', syncTopFromMain, { passive: true })
    top.addEventListener('scroll', syncMainFromTop, { passive: true })
    main.addEventListener('wheel', handleMainWheel, { passive: false })
    main.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopDrag)
    window.addEventListener('pointercancel', stopDrag)
    window.addEventListener('resize', update)

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    if (resizeObserver) {
      resizeObserver.observe(main)
      if (main.firstElementChild) {
        resizeObserver.observe(main.firstElementChild)
      }
    }

    return () => {
      main.removeEventListener('scroll', syncTopFromMain)
      top.removeEventListener('scroll', syncMainFromTop)
      main.removeEventListener('wheel', handleMainWheel)
      main.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopDrag)
      window.removeEventListener('pointercancel', stopDrag)
      window.removeEventListener('resize', update)
      resizeObserver?.disconnect()
    }
  }, [])

  return (
    <div className={`table-scroll-shell ${className}`} ref={shellRef}>
      <div
        aria-hidden="true"
        className={`table-scroll-top ${scrollState.hasHorizontalOverflow ? '' : 'table-scroll-top-hidden'}`}
        ref={topRef}
      >
        <div className="table-scroll-spacer" ref={spacerRef} />
      </div>
      <div aria-hidden="true" className="table-scroll-edge table-scroll-edge-left" />
      <div aria-hidden="true" className="table-scroll-edge table-scroll-edge-right" />
      <div
        className={`table-scroll-main ${scrollState.hasHorizontalOverflow ? 'table-scroll-main-draggable' : ''} ${scrollState.isDragging ? 'table-scroll-main-dragging' : ''}`}
        ref={mainRef}
      >
        {children}
      </div>
    </div>
  )
}
