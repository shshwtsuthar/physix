// playground.js - Examples using the Physix engine

// --- Utility Functions (if needed) ---
function getViewport() {
    return [window.innerWidth, window.innerHeight];
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// --- Basic Demo Setup ---
function setupBasicDemo(physix) {
    console.log("Setting up Basic Demo");
    physix.setGravity(0, 9.81 * 50); // Reset gravity if changed by other demos
    physix.debug = true; // Show debug grid

    // Add some circles
    for (let i = 0; i < 10; i++) {
        const radius = Math.random() * 15 + 5; // 5 to 20
        const circle = new Circle(
            Math.random() * physix.canvas.width,
            Math.random() * physix.canvas.height / 3, // Start near top
            radius,
            getRandomColor()
        );
        circle.mass = radius * 0.5; // Mass proportional to radius
        circle.restitution = 0.6 + Math.random() * 0.3; // Bounciness 0.6 - 0.9
        circle.velocity.x = (Math.random() - 0.5) * 200; // Initial horizontal velocity
        physix.addEntity(circle);
    }

    // Add some rectangles
    for (let i = 0; i < 5; i++) {
        const width = Math.random() * 40 + 10; // 10 to 50
        const height = Math.random() * 40 + 10;
        const rect = new Rectangle(
            Math.random() * physix.canvas.width,
            Math.random() * physix.canvas.height / 3,
            width,
            height,
            getRandomColor()
        );
        rect.mass = (width * height) * 0.05;
        rect.restitution = 0.4 + Math.random() * 0.3; // Less bouncy
        rect.velocity.x = (Math.random() - 0.5) * 100;
         // rect.boundaryBehavior = 'wrap'; // Example: make rectangles wrap
        physix.addEntity(rect);
    }

    // Add a large static circle (kinematic)
    const staticCircle = new Circle(physix.canvas.width / 2, physix.canvas.height + 180, 200, "#333333");
    staticCircle.hasPhysics = false; // Make it static (no gravity, no movement)
    // physix.addEntity(staticCircle); // Uncomment to add a static floor circle

     // Add a floor rectangle
     const floor = new Rectangle(physix.canvas.width / 2, physix.canvas.height - 10, physix.canvas.width, 20, "#555555");
     floor.hasPhysics = false; // Static
     // physix.addEntity(floor); // Uncomment to add a static floor rectangle

}

// --- Cloth Simulation Demo ---
function setupClothDemo(physix) {
    console.log("Setting up Cloth Demo");
    physix.setGravity(0, 9.81 * 30); // Lighter gravity for cloth
    physix.debug = false; // Hide grid

    const clothWidth = 25; // Number of particles wide
    const clothHeight = 15; // Number of particles high
    const spacing = 15;    // Spacing between particles
    const stiffness = 0.8; // Constraint stiffness
    const startX = physix.canvas.width / 2 - (clothWidth * spacing) / 2;
    const startY = 50;

    const particles = []; // 2D array to store particles [y][x]

    // Create particles
    for (let y = 0; y < clothHeight; y++) {
        particles[y] = [];
        for (let x = 0; x < clothWidth; x++) {
            const particle = new VerletObject(
                startX + x * spacing,
                startY + y * spacing,
                3, // Small radius
                `hsl(${(x / clothWidth) * 180 + 180}, 70%, 60%)` // Color gradient blue-magenta
            );
            particle.mass = 0.1; // Light mass for cloth particles
            particle.friction = 0.02; // Some air drag

            // Pin the top row (every few particles)
            if (y === 0 && (x % 4 === 0 || x === clothWidth -1)) {
                particle.pinned = true;
            }

            particles[y][x] = particle;
            physix.addEntity(particle);
        }
    }

    // Create constraints (links between particles)
    for (let y = 0; y < clothHeight; y++) {
        for (let x = 0; x < clothWidth; x++) {
            const p1 = particles[y][x];

            // Horizontal connection
            if (x < clothWidth - 1) {
                const p2 = particles[y][x + 1];
                p1.constrain(p2, spacing, stiffness);
            }
            // Vertical connection
            if (y < clothHeight - 1) {
                const p2 = particles[y + 1][x];
                p1.constrain(p2, spacing, stiffness);
            }
            // Diagonal connections (optional, for shear strength)
            /* // Uncomment for diagonal constraints
            if (x < clothWidth - 1 && y < clothHeight - 1) {
                 const p2 = particles[y + 1][x + 1];
                 p1.constrain(p2, spacing * Math.SQRT2, stiffness * 0.5); // Weaker diagonal
            }
            if (x > 0 && y < clothHeight - 1) {
                 const p2 = particles[y + 1][x - 1];
                 p1.constrain(p2, spacing * Math.SQRT2, stiffness * 0.5);
            }
             */
        }
    }

     // --- Mouse Interaction for Cloth ---
     let draggedParticle = null;
     let mouseConstraint = null; // Temporary constraint for dragging

     physix.canvas.addEventListener('mousedown', (e) => {
         const rect = physix.canvas.getBoundingClientRect();
         const mouseX = e.clientX - rect.left;
         const mouseY = e.clientY - rect.top;

         let closestDistSq = 100*100; // Max distance to grab (squared)

         for (const entity of physix.entities) {
             if (entity instanceof VerletObject && !entity.pinned) {
                 const dx = entity.position.x - mouseX;
                 const dy = entity.position.y - mouseY;
                 const distSq = dx * dx + dy * dy;

                 if (distSq < closestDistSq) {
                     closestDistSq = distSq;
                     draggedParticle = entity;
                 }
             }
         }

         if (draggedParticle) {
             // Temporarily store old position before drag starts
             draggedParticle.dragOrigin = { x: draggedParticle.position.x, y: draggedParticle.position.y };
             // Make it kinematic while dragging? Or apply a strong force? Let's try position setting.
         }
     });

     physix.canvas.addEventListener('mousemove', (e) => {
         if (!draggedParticle) return;

         const rect = physix.canvas.getBoundingClientRect();
         const mouseX = e.clientX - rect.left;
         const mouseY = e.clientY - rect.top;

         // Directly set position while dragging
         draggedParticle.oldPosition.x = draggedParticle.position.x; // Keep velocity somewhat realistic
         draggedParticle.oldPosition.y = draggedParticle.position.y;
         draggedParticle.position.x = mouseX;
         draggedParticle.position.y = mouseY;
          // Reset acceleration to prevent carried-over forces
         draggedParticle.verletAcceleration.x = 0;
         draggedParticle.verletAcceleration.y = 0;
     });

     physix.canvas.addEventListener('mouseup', (e) => {
         if (draggedParticle) {
             // Restore non-kinematic state
             // oldPosition is already updated by mousemove, so releasing should give it velocity
             draggedParticle = null;
         }
     });
      physix.canvas.addEventListener('mouseleave', (e) => { // Stop dragging if mouse leaves canvas
         if (draggedParticle) {
              draggedParticle = null;
         }
     });


     // Optional: Add wind effect
     setInterval(() => {
        if (Math.random() < 0.3) { // 30% chance of wind gust each interval
             const windForce = (Math.random() - 0.5) * 500; // Random horizontal wind force
             console.log(`Wind gust: ${windForce.toFixed(2)}`);
             for (const entity of physix.entities) {
                 if (entity instanceof VerletObject && !entity.pinned) {
                     // Apply wind force (scaled by mass implicitly via applyVerletForce)
                     entity.applyVerletForce(windForce, 0);
                 }
             }
         }
     }, 2000); // Check for wind every 2 seconds

}

// --- Vector Field Visualization (Example - Doesn't interact with physics directly) ---
class VectorField {
    constructor(width, height, resolution = 20) {
      this.width = width;
      this.height = height;
      this.resolution = resolution;
      this.cols = Math.floor(width / resolution);
      this.rows = Math.floor(height / resolution);
      this.vectors = new Array(this.cols * this.rows).fill(null).map(() => ({ dx: 0, dy: 0 }));
      this.gpu = new GPU(); // Separate GPU instance for the field potentially

        // Potential GPU kernel for updating vectors (example: Perlin noise)
        this.updateKernel = this.gpu.createKernel(function(time) {
            const x = this.thread.x;
            const y = this.thread.y;
            // Simple time-varying angle based on position
             const angle = Math.sin(x * 0.1 + time * 0.5) * Math.cos(y * 0.1 + time * 0.5) * Math.PI;
            // Perlin noise would be better here if library available
             return [Math.cos(angle), Math.sin(angle)]; // Return [dx, dy]
        }).setOutput([this.cols, this.rows]);

    }

    // Update the field (e.g., based on noise, mouse, or physics forces)
    update(time, physixInstance) {
        // Example 1: Use GPU kernel for noise
        const result = this.updateKernel(time);
        // Flatten result for easier access if needed, or access as result[y][x]
         for(let y = 0; y < this.rows; y++) {
             for(let x = 0; x < this.cols; x++) {
                 const index = y * this.cols + x;
                 this.vectors[index] = { dx: result[y][x][0], dy: result[y][x][1] };
             }
         }


        // Example 2: Simple Gravity Field (CPU)
        /*
        const gravity = physixInstance.gravity;
        for (let i = 0; i < this.vectors.length; i++) {
            // Visualize normalized gravity direction
            const len = Math.sqrt(gravity.x * gravity.x + gravity.y * gravity.y);
            this.vectors[i] = {
                dx: len > 0 ? gravity.x / len : 0,
                dy: len > 0 ? gravity.y / len : 0
            };
        }
        */
    }

    // Render the vector field onto a given context
    render(ctx) {
        ctx.strokeStyle = 'rgba(0, 150, 255, 0.4)';
        ctx.lineWidth = 1;

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const index = y * this.cols + x;
                const vector = this.vectors[index];
                const startX = (x + 0.5) * this.resolution;
                const startY = (y + 0.5) * this.resolution;

                const length = Math.sqrt(vector.dx * vector.dx + vector.dy * vector.dy);
                if (length === 0) continue;

                const scale = 10; // How long the arrows are
                const endX = startX + vector.dx * scale;
                const endY = startY + vector.dy * scale;

                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);

                // Draw arrowhead
                const headLength = 5;
                const angle = Math.atan2(vector.dy, vector.dx);
                 ctx.moveTo(endX, endY);
                 ctx.lineTo(endX - headLength * Math.cos(angle - Math.PI / 6), endY - headLength * Math.sin(angle - Math.PI / 6));
                 ctx.moveTo(endX, endY);
                 ctx.lineTo(endX - headLength * Math.cos(angle + Math.PI / 6), endY - headLength * Math.sin(angle + Math.PI / 6));

                ctx.stroke();
            }
        }
    }
}
function setupVectorFieldDemo(physix) {
    console.log("Setting up Vector Field Demo (runs alongside physics)");
    const vectorField = new VectorField(physix.canvas.width, physix.canvas.height, 30);

    // Override the engine's render method to draw the field first
    const originalRender = physix.render.bind(physix); // Bind context
    physix.render = function() {
         // Update field based on time
         vectorField.update(performance.now() / 1000, physix);

         // Call original render first to clear canvas etc.
         originalRender();

         // Render the vector field on top
         vectorField.render(physix.ctx);
    };
}


// --- Fluid Simulation Demo (Advanced, separate system using GPU.js) ---
// Note: This FluidSimulation class is complex and self-contained.
// It uses GPU.js heavily but doesn't directly interact with Physix entities.
// It renders *to* the same canvas context.
class FluidSimulation {
     constructor(width, height, resolution = 64) {
        this.width = width;
        this.height = height;
        this.resolution = resolution;
        this.gridSize = resolution * resolution;

        // Using Float32Array for better GPU compatibility if needed
        this.density = new Float32Array(this.gridSize).fill(0);
        this.velocityX = new Float32Array(this.gridSize).fill(0);
        this.velocityY = new Float32Array(this.gridSize).fill(0);

        this.densityPrev = new Float32Array(this.gridSize).fill(0);
        this.velocityXPrev = new Float32Array(this.gridSize).fill(0);
        this.velocityYPrev = new Float32Array(this.gridSize).fill(0);

        try {
            this.gpu = new GPU();
            this.setupKernels();
            this.kernelsReady = true;
            console.log("FluidSimulation Kernels Ready.");
        } catch (e) {
            console.error("Failed to initialize GPU.js or kernels for FluidSimulation:", e);
            this.kernelsReady = false;
        }

         this.diffusion = 0.00001; // Rate of diffusion
         this.viscosity = 0.000001; // Fluid viscosity
         this.iterations = 10; // Solver iterations (more = stable, slow)
         this.fadeRate = 0.995; // How quickly density fades
    }

     IX(x, y) { // Helper to get 1D index from 2D grid coordinates
        x = Math.max(0, Math.min(this.resolution - 1, Math.floor(x)));
        y = Math.max(0, Math.min(this.resolution - 1, Math.floor(y)));
        return x + y * this.resolution;
    }

    setupKernels() {
        const size = this.resolution;

        // Advection: Move field values along the velocity field
        this.advectKernel = this.gpu.createKernel(function(field, velX, velY, dt, size) {
            const x = this.thread.x;
            const y = this.thread.y;

            let prevX = x - velX[y * size + x] * dt * size; // Scale dt by size? Yes.
            let prevY = y - velY[y * size + x] * dt * size;

            // Clamp to grid boundaries (slightly inset)
            prevX = Math.max(0.5, Math.min(size - 1.5, prevX));
            prevY = Math.max(0.5, Math.min(size - 1.5, prevY));

            const i0 = Math.floor(prevY);
            const i1 = i0 + 1;
            const j0 = Math.floor(prevX);
            const j1 = j0 + 1;

            const s1 = prevX - j0;
            const s0 = 1.0 - s1;
            const t1 = prevY - i0;
            const t0 = 1.0 - t1;

            // Bilinear interpolation
            return s0 * (t0 * field[i0 * size + j0] + t1 * field[i1 * size + j0]) +
                   s1 * (t0 * field[i0 * size + j1] + t1 * field[i1 * size + j1]);
        }, { output: [size, size], argumentTypes: { field: 'Array', velX: 'Array', velY: 'Array', dt: 'Float', size: 'Integer' }, returnType: 'Float' })
         .setPipeline(true); // Use pipeline mode for potential speedup

        // Diffusion (using Gauss-Seidel relaxation)
        // Note: GPU.js makes iterative solvers tricky. We run the kernel multiple times.
        this.diffuseKernel = this.gpu.createKernel(function(x_current, x_prev, diff, dt, size) {
            const i = this.thread.x; // Grid index (0 to size*size-1)
            const row = Math.floor(i / size);
            const col = i % size;

            const a = dt * diff * size * size;

            // Get neighbors (with boundary clamping) - Careful with indices!
            const up    = Math.max(0, row - 1) * size + col;
            const down  = Math.min(size - 1, row + 1) * size + col;
            const left  = row * size + Math.max(0, col - 1);
            const right = row * size + Math.min(size - 1, col + 1);

            return (x_prev[i] + a * (x_current[up] + x_current[down] + x_current[left] + x_current[right])) / (1 + 4 * a);
        }, { output: [size * size], argumentTypes: { x_current:'Array', x_prev:'Array', diff:'Float', dt:'Float', size:'Integer'}, returnType: 'Float' })
          .setPipeline(true);


        // Projection step 1: Calculate divergence
        this.divergenceKernel = this.gpu.createKernel(function(velX, velY, size) {
             const i = this.thread.x; // Grid index
             const row = Math.floor(i / size);
             const col = i % size;

             // Neighbor indices (handle boundaries - Neumann boundary: velocity reflects)
             const up_idx    = (row === 0 ? 0 : -1) * size + i;
             const down_idx  = (row === size - 1 ? 0 : 1) * size + i;
             const left_idx  = (col === 0 ? 0 : -1) + i;
             const right_idx = (col === size - 1 ? 0 : 1) + i;

             const vx_right = velX[right_idx];
             const vx_left  = velX[left_idx];
             const vy_down  = velY[down_idx];
             const vy_up    = velY[up_idx];

             // Boundary condition handling (Neumann: reflect velocity component normal to boundary)
             const vx_r_bc = (col === size - 1) ? -vx_right : vx_right;
             const vx_l_bc = (col === 0) ? -vx_left : vx_left;
             const vy_d_bc = (row === size - 1) ? -vy_down : vy_down;
             const vy_u_bc = (row === 0) ? -vy_up : vy_up;


             return -0.5 * ((vx_r_bc - vx_l_bc) + (vy_d_bc - vy_u_bc)) / size; // Should not divide by size? Check Jos Stam paper. Let's keep it for now.
         }, { output: [size * size], argumentTypes: { velX: 'Array', velY: 'Array', size: 'Integer' }, returnType: 'Float' })
           .setPipeline(true);

         // Projection step 2: Solve pressure (Gauss-Seidel again)
         this.pressureKernel = this.gpu.createKernel(function(p_current, divergence, size) {
             const i = this.thread.x; // Grid index
             const row = Math.floor(i / size);
             const col = i % size;

             // Get neighbors (with boundary clamping for pressure - Dirichlet boundary: pressure is 0?)
             // Let's try same boundaries as diffusion for simplicity first.
             const up    = Math.max(0, row - 1) * size + col;
             const down  = Math.min(size - 1, row + 1) * size + col;
             const left  = row * size + Math.max(0, col - 1);
             const right = row * size + Math.min(size - 1, col + 1);

             return (divergence[i] + (p_current[up] + p_current[down] + p_current[left] + p_current[right])) / 4.0;
         }, { output: [size * size], argumentTypes: { p_current: 'Array', divergence: 'Array', size: 'Integer' }, returnType: 'Float' })
           .setPipeline(true);

         // Projection step 3: Subtract pressure gradient
         this.gradientKernel = this.gpu.createKernel(function(vel, pressure, size, component) { // component: 0 for X, 1 for Y
              const i = this.thread.x; // Grid index
              const row = Math.floor(i / size);
              const col = i % size;

              const up    = Math.max(0, row - 1) * size + col;
              const down  = Math.min(size - 1, row + 1) * size + col;
              const left  = row * size + Math.max(0, col - 1);
              const right = row * size + Math.min(size - 1, col + 1);

             let grad = 0;
             if (component === 0) { // X gradient
                 grad = (pressure[right] - pressure[left]);
                 if (col === 0) grad = pressure[right] - pressure[i]; // Boundary approx
                 if (col === size - 1) grad = pressure[i] - pressure[left]; // Boundary approx

             } else { // Y gradient
                 grad = (pressure[down] - pressure[up]);
                  if (row === 0) grad = pressure[down] - pressure[i]; // Boundary approx
                 if (row === size - 1) grad = pressure[i] - pressure[up]; // Boundary approx
             }

             return vel[i] - 0.5 * grad * size; // Multiply by size? Yes.
         }, { output: [size * size], argumentTypes: { vel:'Array', pressure:'Array', size:'Integer', component:'Integer'}, returnType: 'Float' })
           .setPipeline(true);


        // Kernel to render density to canvas pixels
        this.renderKernel = this.gpu.createKernel(function(density, size) {
             const x = Math.floor(this.thread.x / (this.constants.canvasWidth / size));
             const y = Math.floor((this.constants.canvasHeight - 1 - this.thread.y) / (this.constants.canvasHeight / size)); // Flip Y

             const d = density[x + y * size]; // Clamp? No, index should be safe
             const intensity = Math.min(1.0, Math.max(0.0, d)); // Clamp density 0-1

             // Simple grayscale, or color based on density
             // this.color(intensity, intensity, intensity, 1); // Grayscale
             // Example color: Blueish smoke
              this.color(intensity * 0.5, intensity * 0.7, intensity * 1.0, intensity * 0.8); // RGBA
         })
         .setOutput([this.width, this.height])
         .setGraphical(true)
         .setConstants({ canvasWidth: this.width, canvasHeight: this.height });
    }

    addSource(destArray, sourceArray, dt) {
        for (let i = 0; i < this.gridSize; i++) {
            destArray[i] += sourceArray[i] * dt;
        }
    }

     diffuse(field, fieldPrev, diff, dt) {
         // GPU implementation: Run kernel multiple times
         let current = field;
         let prev = fieldPrev; // Use fieldPrev as the starting point
          for (let k = 0; k < this.iterations; k++) {
              current = this.diffuseKernel(current, prev, diff, dt, this.resolution);
             // Swap? No, GPU kernel takes current state and previous state
             // For next iteration, the 'current' output becomes the input for the neighbors,
             // but it still uses the original 'prev' (x0) term. This is Gauss-Seidel.
              // Maybe we need two buffers and swap them?
              // Let's try passing the output back as input.
          }
         return current; // Return the result after iterations

          // CPU Implementation (for reference)
         /*
         const a = dt * diff * this.resolution * this.resolution;
         for (let k = 0; k < this.iterations; k++) {
             for (let y = 0; y < this.resolution; y++) {
                 for (let x = 0; x < this.resolution; x++) {
                      const i = this.IX(x,y);
                      const up = this.IX(x, y-1);
                      const down = this.IX(x, y+1);
                      const left = this.IX(x-1, y);
                      const right = this.IX(x+1, y);
                      field[i] = (fieldPrev[i] + a * (field[up] + field[down] + field[left] + field[right])) / (1 + 4 * a);
                 }
             }
             // set_bnd(b, x); // Boundary handling would go here
         }
         */
     }

      project(velX, velY, p, div) {
         // GPU Implementation
         div = this.divergenceKernel(velX, velY, this.resolution);
         // Clear pressure field 'p' before solving (or pass a zeroed array)
          p.fill(0); // Assuming p is passed by reference and is a Float32Array

         for (let k = 0; k < this.iterations; k++) {
             p = this.pressureKernel(p, div, this.resolution);
             // set_bnd pressure here if needed
         }

         velX = this.gradientKernel(velX, p, this.resolution, 0); // Update velX
         velY = this.gradientKernel(velY, p, this.resolution, 1); // Update velY

          // CPU Implementation (for reference)
         /*
         for (let y = 0; y < this.resolution; y++) {
             for (let x = 0; x < this.resolution; x++) {
                 const i = this.IX(x,y);
                 const up = this.IX(x, y-1);
                 const down = this.IX(x, y+1);
                 const left = this.IX(x-1, y);
                 const right = this.IX(x+1, y);
                 div[i] = -0.5 * ( (velX[right] - velX[left]) + (velY[down] - velY[up]) ) / this.resolution;
                 p[i] = 0;
             }
         }
         // set_bnd divergence and pressure

         for (let k = 0; k < this.iterations; k++) {
             for (let y = 0; y < this.resolution; y++) {
                 for (let x = 0; x < this.resolution; x++) {
                      const i = this.IX(x,y);
                      const up = this.IX(x, y-1);
                      const down = this.IX(x, y+1);
                      const left = this.IX(x-1, y);
                      const right = this.IX(x+1, y);
                      p[i] = (div[i] + p[up] + p[down] + p[left] + p[right]) / 4;
                 }
             }
             // set_bnd pressure
         }

         for (let y = 0; y < this.resolution; y++) {
             for (let x = 0; x < this.resolution; x++) {
                 const i = this.IX(x,y);
                 const left = this.IX(x-1, y);
                 const right = this.IX(x+1, y);
                 const up = this.IX(x, y-1);
                 const down = this.IX(x, y+1);
                 velX[i] -= 0.5 * (p[right] - p[left]) * this.resolution;
                 velY[i] -= 0.5 * (p[down] - p[up]) * this.resolution;
             }
         }
          // set_bnd velocity
          */

          // Return the modified velocity arrays (GPU kernels return new Textures/Arrays)
          return { velX, velY };
     }

      advect(field, fieldPrev, velX, velY, dt) {
         // GPU Implementation
          return this.advectKernel(fieldPrev, velX, velY, dt, this.resolution);

         // CPU Implementation (for reference)
         /*
         const dt0 = dt * this.resolution;
         for (let y = 0; y < this.resolution; y++) {
             for (let x = 0; x < this.resolution; x++) {
                 const i = this.IX(x,y);
                 let prevX = x - dt0 * velX[i];
                 let prevY = y - dt0 * velY[i];

                 prevX = Math.max(0.5, Math.min(this.resolution - 0.5, prevX));
                 prevY = Math.max(0.5, Math.min(this.resolution - 0.5, prevY));

                 const i0 = Math.floor(prevY);
                 const i1 = i0 + 1;
                 const j0 = Math.floor(prevX);
                 const j1 = j0 + 1;

                 const s1 = prevX - j0;
                 const s0 = 1.0 - s1;
                 const t1 = prevY - i0;
                 const t0 = 1.0 - t1;

                 const idx_i0j0 = this.IX(j0, i0);
                 const idx_i1j0 = this.IX(j0, i1);
                 const idx_i0j1 = this.IX(j1, i0);
                 const idx_i1j1 = this.IX(j1, i1);

                 field[i] = s0 * (t0 * fieldPrev[idx_i0j0] + t1 * fieldPrev[idx_i1j0]) +
                            s1 * (t0 * fieldPrev[idx_i0j1] + t1 * fieldPrev[idx_i1j1]);
             }
         }
         // set_bnd(b, d);
         */
     }

    step(dt) {
        if (!this.kernelsReady) return; // Don't step if kernels failed

        // --- Velocity Step ---
         // Diffuse velocity
         // Swap buffers technique might be needed for GPU diffusion/pressure solve if results depend on neighbours from the *same* iteration.
         // Sticking with simpler approach for now.
         this.velocityX = this.diffuse(this.velocityX, this.velocityXPrev, this.viscosity, dt);
         this.velocityY = this.diffuse(this.velocityY, this.velocityYPrev, this.viscosity, dt);
         // Copy result back to Prev for next step's advection source? Or does pipeline handle this? Assume pipeline handles it.
          this.velocityXPrev.set(this.velocityX);
          this.velocityYPrev.set(this.velocityY);


         // Project velocity to make it incompressible
          const projected = this.project(this.velocityX, this.velocityY, this.densityPrev, this.velocityXPrev); // Reuse densityPrev/velocityXPrev as temp buffers for p/div
          this.velocityX = projected.velX;
          this.velocityY = projected.velY;
          // Copy result back to Prev for next step's advection source?
          this.velocityXPrev.set(this.velocityX);
          this.velocityYPrev.set(this.velocityY);


         // Advect velocity field by itself
          this.velocityX = this.advect(this.velocityX, this.velocityXPrev, this.velocityXPrev, this.velocityYPrev, dt);
          this.velocityY = this.advect(this.velocityY, this.velocityYPrev, this.velocityXPrev, this.velocityYPrev, dt);
          // Copy result back to Prev for next step's advection source?
          this.velocityXPrev.set(this.velocityX);
          this.velocityYPrev.set(this.velocityY);


         // Project velocity again to fix any errors introduced by advection
          const projected2 = this.project(this.velocityX, this.velocityY, this.densityPrev, this.velocityXPrev);
          this.velocityX = projected2.velX;
          this.velocityY = projected2.velY;
           // No need to copy back to Prev here, velocity step is done.


        // --- Density Step ---
        // Diffuse density
          this.density = this.diffuse(this.density, this.densityPrev, this.diffusion, dt);
          // Copy result back to Prev for next step's advection source
          this.densityPrev.set(this.density);

         // Advect density along the final velocity field
          this.density = this.advect(this.density, this.densityPrev, this.velocityX, this.velocityY, dt);

          // Fade density slightly
          for (let i = 0; i < this.gridSize; i++) {
              this.density[i] *= this.fadeRate;
          }
           // No need to copy density to Prev after fading.
    }

     addDensity(x, y, amount) {
        const gridX = x / this.width * this.resolution;
        const gridY = y / this.height * this.resolution;
        const index = this.IX(gridX, gridY);
        if (index >= 0 && index < this.gridSize) {
            this.density[index] = Math.min(1.0, this.density[index] + amount) ; // Add and clamp density
        }
    }

     addVelocity(x, y, amountX, amountY) {
         const gridX = x / this.width * this.resolution;
         const gridY = y / this.height * this.resolution;
         const index = this.IX(gridX, gridY);
         if (index >= 0 && index < this.gridSize) {
            this.velocityX[index] += amountX;
            this.velocityY[index] += amountY;
        }
    }

    render(ctx) {
        if (!this.kernelsReady) return; // Don't render if kernels failed

        // Run the GPU render kernel
        this.renderKernel(this.density, this.resolution);

        // Draw the output of the kernel (which is on the GPU object's internal canvas)
         // to the main canvas context provided
         const sourceCanvas = this.renderKernel.canvas || this.gpu.getCanvas();
         if (sourceCanvas) {
             // Blend fluid onto existing canvas content
             ctx.globalAlpha = 0.9; // Adjust alpha for blending effect
             ctx.globalCompositeOperation = 'lighter'; // Nice effect for smoke/light
             ctx.drawImage(sourceCanvas, 0, 0, this.width, this.height);
             ctx.globalAlpha = 1.0; // Reset alpha
             ctx.globalCompositeOperation = 'source-over'; // Reset composite mode
         } else {
             console.warn("Could not get canvas from fluid render kernel.");
         }
    }
}
function setupFluidDemo(physix) {
    console.log("Setting up Fluid Simulation Demo");
    const fluid = new FluidSimulation(physix.canvas.width, physix.canvas.height, 128); // Higher resolution

    let lastMouseX = physix.canvas.width / 2;
    let lastMouseY = physix.canvas.height / 2;

    physix.canvas.addEventListener('mousemove', (e) => {
        const rect = physix.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const dx = e.movementX || (x - lastMouseX); // Calculate delta movement
        const dy = e.movementY || (y - lastMouseY);

        // Add density and velocity when mouse button is pressed
        if (e.buttons === 1) { // Check if left mouse button is down
             const densityAmount = 1.0; // Stronger density injection
             const velocityScale = 5.0; // Scale up velocity effect
             fluid.addDensity(x, y, densityAmount);
             fluid.addVelocity(x, y, dx * velocityScale, dy * velocityScale);
        }
         lastMouseX = x;
         lastMouseY = y;
    });

     // Add a continuous source (like smoke rising)
     /* // Uncomment for smoke source
     setInterval(() => {
         const sourceX = physix.canvas.width / 2;
         const sourceY = physix.canvas.height * 0.8;
         fluid.addDensity(sourceX, sourceY, 0.5);
         fluid.addVelocity(sourceX, sourceY, (Math.random()-0.5)*10, -10); // Slight sideways jitter, upward velocity
     }, 100); // Add smoke every 100ms
     */


    // Override the engine's update and render to include the fluid sim
     const originalUpdate = physix.update.bind(physix);
     const originalRender = physix.render.bind(physix);

     physix.update = function(deltaTime) {
         originalUpdate(deltaTime); // Update regular physics
         fluid.step(deltaTime);     // Update fluid simulation
     };

     physix.render = function() {
         originalRender();         // Render regular physics entities
         fluid.render(physix.ctx); // Render fluid simulation on top
     };
}


// --- Main Execution ---
document.addEventListener("DOMContentLoaded", () => {
    try {
        const physix = new Physix("myCanvas");

        // Set canvas size (adjust as needed)
        const [viewWidth, viewHeight] = getViewport();
        physix.setCanvasSize(Math.min(viewWidth - 50, 1000), Math.min(viewHeight - 150, 700));

        // --- CHOOSE WHICH DEMO TO RUN ---
        setupBasicDemo(physix);
        // setupClothDemo(physix);
        // setupVectorFieldDemo(physix); // Runs alongside other demos if uncommented after them
        // setupFluidDemo(physix); // Note: Fluid demo overrides update/render, run it last if combining


        // Add simple mouse interaction to apply force to basic objects
        let mousePos = null;
        physix.canvas.addEventListener('mousemove', e => {
            const rect = physix.canvas.getBoundingClientRect();
            mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        });
         physix.canvas.addEventListener('mouseleave', e => mousePos = null);
         physix.canvas.addEventListener('mousedown', e => {
            if (mousePos) { // Only apply force if mouse is over canvas
                const forceStrength = 50000; // Adjust force strength
                 for (const entity of physix.entities) {
                      if (entity.hasPhysics && !(entity instanceof VerletObject) && !(entity instanceof Rectangle)) { // Avoid applying to rectangles/verlet for now
                          const dx = entity.position.x - mousePos.x;
                          const dy = entity.position.y - mousePos.y;
                          const distSq = dx*dx + dy*dy;
                          if (distSq < 100*100) { // Apply force within a radius
                             const dist = Math.sqrt(distSq);
                             const forceX = (dx / dist) * forceStrength / (dist * 0.1 + 1); // Force directed away from mouse, inverse square-ish falloff
                             const forceY = (dy / dist) * forceStrength / (dist * 0.1 + 1);
                              // entity.applyForce(forceX, forceY); // Push away
                              // Apply impulse instead?
                               entity.velocity.x += forceX / entity.mass * 0.01; // Apply as velocity change
                               entity.velocity.y += forceY / entity.mass * 0.01;

                          }
                      }
                 }
            }
        });


        // Start the simulation
        physix.start();

    } catch (error) {
        console.error("Failed to initialize Physix:", error);
        // Display error message to the user?
        document.body.innerHTML = `<p style="color: red; font-weight: bold;">Error initializing Physix engine. Check console (F12) for details.</p><pre>${error.stack}</pre>`;
    }
});