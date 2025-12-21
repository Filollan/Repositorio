/**
 * Utilidad para scroll suave mejorado con offset automático
 */

interface SmoothScrollOptions {
  offset?: number;
  duration?: number;
  easing?: (t: number) => number;
}

/**
 * Easing function para animación suave
 */
const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/**
 * Scroll suave a un elemento con opciones personalizables
 */
export const smoothScrollToElement = (
  element: HTMLElement | string,
  options: SmoothScrollOptions = {}
): void => {
  const {
    offset = 80, // Offset por defecto para header fijo
    duration = 800,
    easing = easeInOutCubic
  } = options;

  const targetElement = typeof element === 'string' 
    ? document.querySelector<HTMLElement>(element)
    : element;

  if (!targetElement) {
    console.warn('Elemento no encontrado para scroll');
    return;
  }

  const startPosition = window.scrollY;
  const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - offset;
  const distance = targetPosition - startPosition;
  let startTime: number | null = null;

  const animation = (currentTime: number) => {
    if (startTime === null) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const progress = Math.min(timeElapsed / duration, 1);
    const easedProgress = easing(progress);

    window.scrollTo(0, startPosition + distance * easedProgress);

    if (timeElapsed < duration) {
      requestAnimationFrame(animation);
    }
  };

  requestAnimationFrame(animation);
};

/**
 * Inicializar smooth scroll para todos los links de navegación
 */
export const initSmoothScroll = (selector: string = 'a[href^="#"]'): void => {
  document.addEventListener('DOMContentLoaded', () => {
    const links = document.querySelectorAll<HTMLAnchorElement>(selector);

    links.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        
        if (!href || href === '#' || href === '#top') {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        const targetId = href.replace('#', '');
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
          e.preventDefault();
          smoothScrollToElement(targetElement, { offset: 80 });
          
          // Actualizar URL sin hacer scroll
          history.pushState(null, '', href);
        }
      });
    });
  });
};

/**
 * Detectar la sección activa basándose en el scroll
 */
export const getActiveSection = (): string | null => {
  const sections = document.querySelectorAll<HTMLElement>('section[id]');
  const scrollPosition = window.scrollY + 100;

  let activeSection: string | null = null;

  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.offsetHeight;

    if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
      activeSection = section.id;
    }
  });

  return activeSection;
};
