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
    private animationFrame: number | null = null;
  
    constructor(
      canvas: HTMLCanvasElement,
      private options: ParticleOptions = {}
    ) {
      this.canvas = canvas;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not get canvas context');
      this.ctx = context;
  
      // Default options
      this.options = {
        quantity: options.quantity || 20,
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
  
      // Event listeners
      window.addEventListener('resize', this.handleResize);
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
      window.removeEventListener('resize', this.handleResize);
    }
  }