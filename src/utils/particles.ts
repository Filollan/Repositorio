interface ParticleOptions {
  quantity?: number;
  staticity?: number;
  ease?: number;
  particleColor?: {
    light: string;
    dark: string;
  };
}

interface Particle {
  x: number;
  y: number;
  size: number;
  velocityX: number;
  velocityY: number;
}

export class ParticleAnimation {
  private particles: Particle[] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private observer: MutationObserver;
  private intersectionObserver: IntersectionObserver;
  private animationFrame: number | null = null;
  private isVisible: boolean = true;
  private isPaused: boolean = false;

  constructor(
    canvas: HTMLCanvasElement,
    private options: ParticleOptions = {}
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');
    this.ctx = context;

    // Ajustar cantidad de partículas según dispositivo
    const isMobile = window.innerWidth < 768;
    const quantity = isMobile
      ? Math.floor((options.quantity || 20) * 0.5) // 50% menos en móvil
      : (options.quantity || 20);

    // Default options
    this.options = {
      quantity,
      staticity: options.staticity || 3,
      ease: options.ease || 50,
      particleColor: options.particleColor || {
        light: 'rgba(255, 0, 0, 0.6)',
        dark: 'rgba(255, 255, 255, 0.6)'
      }
    };

    // Inicializar observer para cambios de tema
    this.observer = new MutationObserver(() => {
      this.updateParticles();
    });

    // Intersection Observer para pausar cuando no está visible
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          this.isVisible = entry.isIntersecting;
          if (entry.isIntersecting && !this.isPaused) {
            this.updateParticles();
          }
        });
      },
      { threshold: 0.1 }
    );

    this.init();
  }

  private init(): void {
    this.resizeCanvas();
    this.initParticles();
    this.updateParticles();

    // Observar cambios en el tema
    this.observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Observar visibilidad del canvas
    this.intersectionObserver.observe(this.canvas);

    // Event listeners
    window.addEventListener('resize', this.handleResize);

    // Pausar animaciones cuando el usuario prefiere reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.isPaused = true;
    }
  }

  private getParticleColor(): string {
    const isDarkMode = document.documentElement.classList.contains('dark');
    return isDarkMode
      ? this.options.particleColor!.dark
      : this.options.particleColor!.light;
  }

  private createParticle(): Particle {
    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      size: Math.random() * 2 + 1,
      velocityX: (Math.random() - 0.5) * this.options.staticity!,
      velocityY: (Math.random() - 0.5) * this.options.staticity!,
    };
  }

  private resizeCanvas = (): void => {
    this.canvas.width = this.canvas.offsetWidth || this.canvas.clientWidth;
    this.canvas.height = this.canvas.offsetHeight || this.canvas.clientHeight;
  };

  private handleResize = (): void => {
    this.resizeCanvas();
    this.initParticles();
  };

  private initParticles(): void {
    this.particles = Array.from(
      { length: this.options.quantity! },
      () => this.createParticle()
    );
  }

  private updateParticles = (): void => {
    // No actualizar si no está visible o está en pausa
    if (!this.isVisible || this.isPaused) {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }
      return;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const particleColor = this.getParticleColor();

    this.particles.forEach((particle) => {
      particle.x += particle.velocityX * (this.options.ease! / 100);
      particle.y += particle.velocityY * (this.options.ease! / 100);

      if (particle.x < 0 || particle.x > this.canvas.width) particle.velocityX *= -1;
      if (particle.y < 0 || particle.y > this.canvas.height) particle.velocityY *= -1;

      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fillStyle = particleColor;
      this.ctx.fill();
    });

    this.animationFrame = requestAnimationFrame(this.updateParticles);
  };

  public destroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.observer.disconnect();
    this.intersectionObserver.disconnect();
    window.removeEventListener('resize', this.handleResize);
  }
}