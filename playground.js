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
    physix.debug = false; // Show debug grid

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
        rect.restitution = 1; // Boink boink
        rect.velocity.x = 3000;
         // rect.boundaryBehavsior = 'wrap'; // Example: make rectangles wrap
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

// // --- Vector Field Visualization (Example - Doesn't interact with physics directly) ---
// class VectorField {
//     constructor(width, height, resolution = 20) {
//       this.width = width;
//       this.height = height;
//       this.resolution = resolution;
//       this.cols = Math.floor(width / resolution);
//       this.rows = Math.floor(height / resolution);
//       this.vectors = new Array(this.cols * this.rows).fill(null).map(() => ({ dx: 0, dy: 0 }));
//       this.gpu = new GPU(); // Separate GPU instance for the field potentially

//         // Potential GPU kernel for updating vectors (example: Perlin noise)
//         this.updateKernel = this.gpu.createKernel(function(time) {
//             const x = this.thread.x;
//             const y = this.thread.y;
//             // Simple time-varying angle based on position
//              const angle = Math.sin(x * 0.1 + time * 0.5) * Math.cos(y * 0.1 + time * 0.5) * Math.PI;
//             // Perlin noise would be better here if library available
//              return [Math.cos(angle), Math.sin(angle)]; // Return [dx, dy]
//         }).setOutput([this.cols, this.rows]);

//     }

//     // Update the field (e.g., based on noise, mouse, or physics forces)
//     update(time, physixInstance) {
//         // Example 1: Use GPU kernel for noise
//         const result = this.updateKernel(time);
//         // Flatten result for easier access if needed, or access as result[y][x]
//          for(let y = 0; y < this.rows; y++) {
//              for(let x = 0; x < this.cols; x++) {
//                  const index = y * this.cols + x;
//                  this.vectors[index] = { dx: result[y][x][0], dy: result[y][x][1] };
//              }
//          }


//         // Example 2: Simple Gravity Field (CPU)
//         /*
//         const gravity = physixInstance.gravity;
//         for (let i = 0; i < this.vectors.length; i++) {
//             // Visualize normalized gravity direction
//             const len = Math.sqrt(gravity.x * gravity.x + gravity.y * gravity.y);
//             this.vectors[i] = {
//                 dx: len > 0 ? gravity.x / len : 0,
//                 dy: len > 0 ? gravity.y / len : 0
//             };
//         }
//         */
//     }

//     // Render the vector field onto a given context
//     render(ctx) {
//         ctx.strokeStyle = 'rgba(0, 150, 255, 0.4)';
//         ctx.lineWidth = 1;

//         for (let y = 0; y < this.rows; y++) {
//             for (let x = 0; x < this.cols; x++) {
//                 const index = y * this.cols + x;
//                 const vector = this.vectors[index];
//                 const startX = (x + 0.5) * this.resolution;
//                 const startY = (y + 0.5) * this.resolution;

//                 const length = Math.sqrt(vector.dx * vector.dx + vector.dy * vector.dy);
//                 if (length === 0) continue;

//                 const scale = 10; // How long the arrows are
//                 const endX = startX + vector.dx * scale;
//                 const endY = startY + vector.dy * scale;

//                 ctx.beginPath();
//                 ctx.moveTo(startX, startY);
//                 ctx.lineTo(endX, endY);

//                 // Draw arrowhead
//                 const headLength = 5;
//                 const angle = Math.atan2(vector.dy, vector.dx);
//                  ctx.moveTo(endX, endY);
//                  ctx.lineTo(endX - headLength * Math.cos(angle - Math.PI / 6), endY - headLength * Math.sin(angle - Math.PI / 6));
//                  ctx.moveTo(endX, endY);
//                  ctx.lineTo(endX - headLength * Math.cos(angle + Math.PI / 6), endY - headLength * Math.sin(angle + Math.PI / 6));

//                 ctx.stroke();
//             }
//         }
//     }
// }
// function setupVectorFieldDemo(physix) {
//     console.log("Setting up Vector Field Demo (runs alongside physics)");
//     const vectorField = new VectorField(physix.canvas.width, physix.canvas.height, 30);

//     // Override the engine's render method to draw the field first
//     const originalRender = physix.render.bind(physix); // Bind context
//     physix.render = function() {
//          // Update field based on time
//          vectorField.update(performance.now() / 1000, physix);

//          // Call original render first to clear canvas etc.
//          originalRender();

//          // Render the vector field on top
//          vectorField.render(physix.ctx);
//     };
// }

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