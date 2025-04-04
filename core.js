// core.js - Physix Engine Core
// TODO: Attach a Latex document explaining fundamental concepts.

// --- Helper Functions (Useful) ---
function hexToRgb(hex) {
    // Expand shorthand form (example "03F") to full form (eg "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}


// The base entity class 
// This is the main blueprint for each and every object existing in our physics.js world
class Entity {
    constructor(x, y) {
        this.position = { x, y };
        this.velocity = { x: 0, y: 0 };
        this.acceleration = { x: 0, y: 0 }; // Used by Euler integration
        this.hasPhysics = true; // Important
        this.friction = 0.05; // Air friction / damping
        this.restitution = 1; // Bounciness (0=none, 1=fully bouncy boink boink)
        this.mass = 1;
        this.boundaryBehavior = 'bounce'; // 'bounce', 'wrap', or 'none'
        this.color = "#ffffff"; // Default color
    }

    // Apply force using F=ma for standard Euler integration
    applyForce(forceX, forceY) {
        if (!this.hasPhysics || this.mass <= 0) return;
        // F = ma => a = F / m
        this.acceleration.x += forceX / this.mass;
        this.acceleration.y += forceY / this.mass;
    }

    // Placeholder render method - subclasses will override this
    render(ctx, gpu) {
        console.warn("Render method not implemented for this entity type:", this);
    }

    // Basic property getters for consistent access (this will be needed for boundary checks)
    get top() { return this.position.y - (this.height ? this.height / 2 : this.radius || 0); }
    get bottom() { return this.position.y + (this.height ? this.height / 2 : this.radius || 0); }
    get left() { return this.position.x - (this.width ? this.width / 2 : this.radius || 0); }
    get right() { return this.position.x + (this.width ? this.width / 2 : this.radius || 0); }
}


// Circle entity
class Circle extends Entity {
    constructor(x, y, radius, color = "#0099ff") {
        super(x, y);
        this.radius = radius;
        this.color = color;
        this._renderKernel = null; // Cache kernel
    }

    render(ctx, gpu) {
        // Optimize: Use direct canvas drawing for small circles
        if (this.radius < 5) { // Adjusted threshold
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            return;
        }

        // Using GPU accelerated rendering for larger circles
        if (!this._renderKernel) {
            const rgb = hexToRgb(this.color) || { r: 0, g: 153, b: 255 }; // Default blue if parse fails
            const outputSize = Math.ceil(this.radius * 2);
            this._renderKernel = gpu.createKernel(function(centerX, centerY, radius, r, g, b) {
                const x = this.thread.x;
                const y = this.constants.outputSize - 1 - this.thread.y; // Flip Y for canvas coords

                const dx = x - centerX;
                const dy = y - centerY;
                const distanceSq = dx * dx + dy * dy;

                if (distanceSq <= radius * radius) {
                    this.color(r / 255, g / 255, b / 255, 1);
                } else {
                    // Optimization: Discard transparent pixels (check if GPU.js supports this well)
                     this.color(0, 0, 0, 0); // Transparent
                }
            }, {
                output: [outputSize, outputSize],
                graphical: true,
                constants: { outputSize: outputSize }
            });
        }

        // Run the kernel
        const kernelOutput = this._renderKernel(this.radius, this.radius, this.radius, this._renderKernel.constants.r, this._renderKernel.constants.g, this._renderKernel.constants.b);

        // Draw the result onto the main canvas
        const sourceCanvas = kernelOutput.canvas || kernelOutput;
         if (sourceCanvas instanceof HTMLCanvasElement) {
            ctx.drawImage(sourceCanvas,
                this.position.x - this.radius,
                this.position.y - this.radius);
         } else {
             // Fallback or WebGL texture handling needed here - For now, draw CPU circle as fallback (slow)
             console.warn("GPU Kernel did not return a drawable canvas for Circle. Falling back to CPU render.");
             ctx.beginPath();
             ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
             ctx.fillStyle = this.color;
             ctx.fill();
         }
    }
     // Override color setter to update kernel constants if needed
     set color(newColor) {
        super.color = newColor;
        const rgb = hexToRgb(newColor) || { r: 0, g: 153, b: 255 };
        if (this._renderKernel) {
            this._renderKernel.setConstants({ r: rgb.r, g: rgb.g, b: rgb.b });
        } else {
            // Store for later kernel creation
             this._pendingR = rgb.r;
             this._pendingG = rgb.g;
             this._pendingB = rgb.b;
        }
    }
    get color() {
        return super.color;
    }
}


// Rectangle enttty
class Rectangle extends Entity {
    constructor(x, y, width, height, color = "#ff5500") {
        super(x, y);
        this.width = width;
        this.height = height;
        this.color = color;
        this._renderKernel = null; // Cache kernel
    }

    render(ctx, gpu) {
        // Use direct canvas drawing for small rectangles
        if (this.width < 10 || this.height < 10) { // Adjusted threshold
            ctx.fillStyle = this.color;
            ctx.fillRect(
                this.position.x - this.width / 2,
                this.position.y - this.height / 2,
                this.width,
                this.height);
            return;
        }

        // GPU accelerated rendering for larger rectangles
        if (!this._renderKernel) {
            const rgb = hexToRgb(this.color) || { r: 255, g: 85, b: 0 }; // Default orange
            const outputWidth = Math.ceil(this.width);
            const outputHeight = Math.ceil(this.height);

            this._renderKernel = gpu.createKernel(function(r, g, b) {
                 // No need for complex checks, just color the whole rectangle
                this.color(r / 255, g / 255, b / 255, 1);
            }, {
                output: [outputWidth, outputHeight],
                graphical: true,
                constants: { r: rgb.r, g: rgb.g, b: rgb.b }
            });
        }

        // Run the kernel
        const kernelOutput = this._renderKernel(this._renderKernel.constants.r, this._renderKernel.constants.g, this._renderKernel.constants.b);


        // Draw the result onto the main canvas
         const sourceCanvas = kernelOutput.canvas || kernelOutput;
         if (sourceCanvas instanceof HTMLCanvasElement) {
            ctx.drawImage(sourceCanvas,
                this.position.x - this.width / 2,
                this.position.y - this.height / 2);
         } else {
              console.warn("GPU Kernel did not return a drawable canvas for Rectangle. Falling back to CPU render.");
              ctx.fillStyle = this.color;
              ctx.fillRect(
                  this.position.x - this.width / 2,
                  this.position.y - this.height / 2,
                  this.width,
                  this.height);
         }
    }
     // Override color setter to update kernel constants
     set color(newColor) {
        super.color = newColor;
        const rgb = hexToRgb(newColor) || { r: 255, g: 85, b: 0 };
        if (this._renderKernel) {
            this._renderKernel.setConstants({ r: rgb.r, g: rgb.g, b: rgb.b });
        } else {
             this._pendingR = rgb.r;
             this._pendingG = rgb.g;
             this._pendingB = rgb.b;
        }
    }
    get color() {
        return super.color;
    }
}


// Verlet Object
// This is a specialized entity (a circle) that uses Verlet Integration for its physics simulation instead of the standard Euler method used by the base Entity. Verlet integration is often more stable, especially for simulations involving constraints (like cloth or ropes), and handles energy conservation better. It works by tracking the current and previous positions to implicitly calculate velocity.
// 
// TODO: Make a LaTeX document and attach it in the README to explain this better
// 
class VerletObject extends Entity {
    constructor(x, y, radius, color = "#44aaff") {
        super(x, y);
        this.radius = radius;
        this.color = color;

        // Verlet integration properties
        this.oldPosition = { x, y };
        this.verletAcceleration = { x: 0, y: 0 }; // Use a separate acceleration for Verlet forces
        this.constraints = [];
        this.pinned = false; // If true, object position is fixed

        // Override some base properties not directly used by Verlet
        this.velocity = { x: 0, y: 0 }; // Keep for compatibility but don't use in Verlet update
        this.acceleration = { x: 0, y: 0 }; // Keep for compatibility but don't use in Verlet update
        this.restitution = 0.9; // Higher default bounciness for Verlet often looks better
        this.friction = 0.01; // Lower friction/damping often needed for stability
    }

    // Apply force for Verlet (accumulates acceleration)
    applyVerletForce(forceX, forceY) {
        if (!this.hasPhysics || this.mass <= 0 || this.pinned) return;
        this.verletAcceleration.x += forceX / this.mass;
        this.verletAcceleration.y += forceY / this.mass;
    }

    // Update position using Verlet integration
    updatePosition(deltaTime) {
        if (!this.hasPhysics || this.pinned) return;

        // Calculate velocity implicitly
        const velX = (this.position.x - this.oldPosition.x) * (1.0 - this.friction);
        const velY = (this.position.y - this.oldPosition.y) * (1.0 - this.friction);

        // Update old position
        this.oldPosition.x = this.position.x;
        this.oldPosition.y = this.position.y;

        // Update current position using Verlet formula: x_next = x + (x - x_old) + a * dt^2
        this.position.x += velX + this.verletAcceleration.x * deltaTime * deltaTime;
        this.position.y += velY + this.verletAcceleration.y * deltaTime * deltaTime;

        // Reset acceleration for the next frame
        this.verletAcceleration.x = 0;
        this.verletAcceleration.y = 0;
    }

    // Add a distance constraint to another VerletObject
    constrain(otherObject, distance, stiffness = 0.5) {
         if (otherObject instanceof VerletObject) {
            this.constraints.push({
                object: otherObject,
                distance: distance,
                stiffness: stiffness // How strongly the constraint pulls (0-1)
            });
         } else {
            console.warn("Cannot constrain VerletObject to non-VerletObject");
         }
    }

    // Solve all distance constraints connected to this object
    solveConstraints() {
        if (this.pinned) return; // Pinned objects don't move due to constraints

        this.constraints.forEach(constraint => {
            const other = constraint.object;
            const targetDistance = constraint.distance;
            const stiffness = constraint.stiffness;

            const dx = other.position.x - this.position.x;
            const dy = other.position.y - this.position.y;
            const currentDistance = Math.sqrt(dx * dx + dy * dy);

            if (currentDistance === 0) return; // Avoid division by zero

            const difference = (targetDistance - currentDistance) / currentDistance;
            const correctionX = dx * difference * stiffness; // Apply stiffness
            const correctionY = dy * difference * stiffness;

             // Distribute correction based on mass (or equally if one is pinned)
            let thisMass = this.pinned ? Infinity : this.mass;
            let otherMass = other.pinned ? Infinity : other.mass;

             if (thisMass === Infinity && otherMass === Infinity) return; // Both pinned

             let totalMassInv = 1 / thisMass + 1 / otherMass; // Use inverse mass

             if (totalMassInv === 0) return; // Should not happen if not both pinned, but safety check


            const thisShare = (1 / thisMass) / totalMassInv;
            const otherShare = (1 / otherMass) / totalMassInv;

             if (!this.pinned) {
                 this.position.x -= correctionX * thisShare;
                 this.position.y -= correctionY * thisShare;
             }
             if (!other.pinned) {
                 other.position.x += correctionX * otherShare;
                 other.position.y += correctionY * otherShare;
             }
        });
    }

    // Render VerletObject (as a circle) and its constraints
    render(ctx, gpu) { // GPU rendering not implemented for VerletObject yet
        // Draw the circle
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.pinned ? "#FFA500" : this.color; // Orange if pinned
        ctx.fill();

        // Render constraints as lines (optional, can be slow for many constraints)
        /* // Uncomment to draw constraint lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 1;
        this.constraints.forEach(constraint => {
             if (constraint.object) { // Ensure object exists
                ctx.beginPath();
                ctx.moveTo(this.position.x, this.position.y);
                ctx.lineTo(constraint.object.position.x, constraint.object.position.y);
                ctx.stroke();
             }
        });
        */
    }
}


// This is our main physics engine class
class Physix {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element with ID "${canvasId}" not found.`);
        }
        this.ctx = this.canvas.getContext("2d");
        try {
            this.gpu = new GPU({ canvas: this.canvas }); // Pass canvas to GPU.js if possible
        } catch (e) {
            console.warn("GPU.js initialization failed. Falling back (rendering might be slower).", e);
            this.gpu = null; // Fallback or handle error appropriately
        }
        this.entities = [];
        this.gravity = { x: 0, y: 9.81 * 50 }; // Gravity scaled (adjust multiplier as needed for visual speed)
        this.constraintIterations = 5; // Number of times to solve constraints per frame for stability
        this.lastTime = 0;
        this.running = false;
        this.debug = false; // Set to true to draw debug grid

         // Accumulated time for fixed timestep updates
        this._accumulator = 0;
        this._fixedDeltaTime = 1 / 60; // Target 60 physics updates per second

        console.log("Physix Engine Initialized");
    }

    setCanvasSize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        console.log(`Canvas size set to ${width}x${height}`);
         // Re-initialize GPU.js kernels if needed, as output size might change
         // (For simplicity, we are not doing this here, but it's important for resizing)
         this.entities.forEach(entity => {
            if (entity._renderKernel) {
                // Invalidate cached kernels on resize
                entity._renderKernel = null;
            }
        });
    }

    setGravity(x, y) {
        this.gravity = { x, y };
        console.log(`Gravity set to (${x}, ${y})`);
    }

    addEntity(entity) {
        if (entity instanceof Entity) {
            this.entities.push(entity);
            console.log("Added entity:", entity);
            return entity; // For chaining
        } else {
            console.warn("Attempted to add non-Entity object:", entity);
            return null;
        }
    }

    removeEntity(entity) {
        const index = this.entities.indexOf(entity);
        if (index !== -1) {
            this.entities.splice(index, 1);
            console.log("Removed entity:", entity);
        }
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        console.log("Physix simulation started.");
        requestAnimationFrame(this._loop.bind(this));
    }

    stop() {
        this.running = false;
        console.log("Physix simulation stopped.");
    }

    // Internal animation loop
    _loop(timestamp) {
        if (!this.running) return;

        const deltaTime = (timestamp - this.lastTime) / 1000; // Delta time in seconds
        this.lastTime = timestamp;

        // --- Fixed Timestep Update ---
        // Accumulate time and perform fixed updates for physics stability
        this._accumulator += deltaTime;
        let updatesPerformed = 0;
        while (this._accumulator >= this._fixedDeltaTime) {
            this.update(this._fixedDeltaTime); // Update physics with fixed step
            this._accumulator -= this._fixedDeltaTime;
            updatesPerformed++;
            if (updatesPerformed > 5) { // Panic break: Avoid spiral of death if lagging badly
                this._accumulator = 0; // Reset accumulator
                console.warn("Physics lagging - clamped updates.");
                break;
            }
        }

        // --- Rendering ---
        this.render(); // Render based on current state

        requestAnimationFrame(this._loop.bind(this));
    }

    // Physics update step (called with fixed deltaTime)
    update(deltaTime) {

        // 1. Apply forces (Gravity)
        for (const entity of this.entities) {
            if (entity.hasPhysics) {
                if (entity instanceof VerletObject) {
                    // Apply gravity force for Verlet objects
                     if(!entity.pinned) {
                         entity.applyVerletForce(this.gravity.x * entity.mass, this.gravity.y * entity.mass);
                     }
                } else {
                    // Apply gravity force for standard objects (using acceleration)
                    entity.applyForce(this.gravity.x * entity.mass, this.gravity.y * entity.mass);
                }
            }
        }

        // 2. Update standard (Euler) objects
        for (const entity of this.entities) {
             if (entity.hasPhysics && !(entity instanceof VerletObject)) {
                 // Integrate acceleration to get velocity
                 entity.velocity.x += entity.acceleration.x * deltaTime;
                 entity.velocity.y += entity.acceleration.y * deltaTime;

                 // Apply friction/damping
                 entity.velocity.x *= (1 - entity.friction);
                 entity.velocity.y *= (1 - entity.friction);

                 // Integrate velocity to get position
                 entity.position.x += entity.velocity.x * deltaTime;
                 entity.position.y += entity.velocity.y * deltaTime;

                 // Reset acceleration for next frame
                 entity.acceleration.x = 0;
                 entity.acceleration.y = 0;
             }
        }


        // 3. Update Verlet objects' positions
        for (const entity of this.entities) {
            if (entity instanceof VerletObject) {
                entity.updatePosition(deltaTime);
            }
        }

        // 4. Solve constraints (multiple iterations for stability)
        for (let i = 0; i < this.constraintIterations; i++) {
            for (const entity of this.entities) {
                if (entity instanceof VerletObject) {
                    entity.solveConstraints();
                }
            }
        }

        // 5. Handle collisions
        this.detectAndResolveCollisions(deltaTime);

        // 6. Handle boundaries
        for (const entity of this.entities) {
            if (entity.hasPhysics) {
                this.handleBoundaries(entity, deltaTime);
            }
        }
    }

    // Consolidated boundary handling
    handleBoundaries(entity, deltaTime) {
         const behavior = entity.boundaryBehavior;
         if (behavior === 'none') return;

         const canvasWidth = this.canvas.width;
         const canvasHeight = this.canvas.height;

         // Use getters for dimensions
         const entityLeft = entity.left;
         const entityRight = entity.right;
         const entityTop = entity.top;
         const entityBottom = entity.bottom;
         const entityWidth = entityRight - entityLeft;
         const entityHeight = entityBottom - entityTop;


         if (behavior === 'wrap') {
            // Wrap around boundaries
            if (entityRight < 0) entity.position.x = canvasWidth + entityWidth / 2;
            if (entityLeft > canvasWidth) entity.position.x = -entityWidth / 2;
            if (entityBottom < 0) entity.position.y = canvasHeight + entityHeight / 2;
            if (entityTop > canvasHeight) entity.position.y = -entityHeight / 2;

         } else if (behavior === 'bounce') {
            const restitution = entity.restitution;

            if (entity instanceof VerletObject) {
                // Verlet boundary collision
                if (entityLeft < 0) {
                    const penetration = 0 - entityLeft;
                    entity.position.x += penetration; // Correct position
                    // Reflect implicit velocity component
                    entity.oldPosition.x = entity.position.x + (entity.position.x - entity.oldPosition.x) * restitution;
                 } else if (entityRight > canvasWidth) {
                    const penetration = entityRight - canvasWidth;
                    entity.position.x -= penetration;
                    entity.oldPosition.x = entity.position.x + (entity.position.x - entity.oldPosition.x) * restitution;
                 }

                 if (entityTop < 0) {
                    const penetration = 0 - entityTop;
                    entity.position.y += penetration;
                    entity.oldPosition.y = entity.position.y + (entity.position.y - entity.oldPosition.y) * restitution;
                 } else if (entityBottom > canvasHeight) {
                    const penetration = entityBottom - canvasHeight;
                    entity.position.y -= penetration;
                    entity.oldPosition.y = entity.position.y + (entity.position.y - entity.oldPosition.y) * restitution;
                 }

            } else {
                // Standard Euler boundary collision
                if (entityLeft < 0) {
                    entity.position.x = entityWidth / 2; // Place at boundary
                    if (entity.velocity.x < 0) {
                        entity.velocity.x *= -restitution;
                    }
                 } else if (entityRight > canvasWidth) {
                    entity.position.x = canvasWidth - entityWidth / 2;
                    if (entity.velocity.x > 0) {
                        entity.velocity.x *= -restitution;
                    }
                 }

                 if (entityTop < 0) {
                    entity.position.y = entityHeight / 2;
                    if (entity.velocity.y < 0) {
                        entity.velocity.y *= -restitution;
                    }
                 } else if (entityBottom > canvasHeight) {
                    entity.position.y = canvasHeight - entityHeight / 2;
                    if (entity.velocity.y > 0) {
                        entity.velocity.y *= -restitution;
                    }
                 }
            }
        }
    }

    // Collision detection and resolution
    detectAndResolveCollisions(deltaTime) {
        // --- Simple Circle/VerletObject Collision ---
        // NOTE: This only handles collisions between Circle and VerletObject entities (treating both as circles).
        //       Rectangle collisions are NOT implemented here.
        for (let i = 0; i < this.entities.length; i++) {
            const a = this.entities[i];
            if (!a.hasPhysics || !(a instanceof Circle || a instanceof VerletObject) || !a.radius) continue;

            for (let j = i + 1; j < this.entities.length; j++) {
                const b = this.entities[j];
                if (!b.hasPhysics || !(b instanceof Circle || b instanceof VerletObject) || !b.radius) continue;

                 if (a.pinned && b.pinned) continue; // Don't collide two pinned objects

                const dx = b.position.x - a.position.x;
                const dy = b.position.y - a.position.y;
                const distanceSq = dx * dx + dy * dy;
                const minDistance = a.radius + b.radius;

                if (distanceSq < minDistance * minDistance && distanceSq > 0.001) { // Check for overlap
                    const distance = Math.sqrt(distanceSq);
                    const overlap = minDistance - distance;

                    // Calculate collision normal (normalized vector from a to b)
                    const nx = dx / distance;
                    const ny = dy / distance;

                    // --- Positional Correction (Resolve overlap) ---
                    const percent = 0.8; // How much overlap to correct per step (prevents jitter)
                    const correctionAmount = overlap * percent;

                    let massAInv = a.pinned ? 0 : 1 / (a.mass || 1);
                    let massBInv = b.pinned ? 0 : 1 / (b.mass || 1);
                    let totalInvMass = massAInv + massBInv;

                     if (totalInvMass > 0) { // Avoid division by zero if both are pinned (should be caught earlier)
                         const correctionX = (nx * correctionAmount) / totalInvMass;
                         const correctionY = (ny * correctionAmount) / totalInvMass;

                         if (!a.pinned) {
                            a.position.x -= correctionX * massAInv;
                            a.position.y -= correctionY * massAInv;
                         }
                         if (!b.pinned) {
                            b.position.x += correctionX * massBInv;
                            b.position.y += correctionY * massBInv;
                         }
                    }


                    // --- Impulse Resolution (Simulate bounce) ---
                    let velAx, velAy, velBx, velBy;

                    // Get velocities (handle Verlet vs Euler)
                    if (a instanceof VerletObject) {
                        velAx = (a.position.x - a.oldPosition.x);
                        velAy = (a.position.y - a.oldPosition.y);
                    } else {
                        velAx = a.velocity.x * deltaTime; // Use velocity scaled by dt for consistency? Or just velocity? Let's use raw velocity.
                        velAy = a.velocity.y * deltaTime;
                         velAx = a.velocity.x;
                         velAy = a.velocity.y;
                    }
                    if (b instanceof VerletObject) {
                        velBx = (b.position.x - b.oldPosition.x);
                        velBy = (b.position.y - b.oldPosition.y);
                    } else {
                         velBx = b.velocity.x;
                         velBy = b.velocity.y;
                    }

                    // Relative velocity
                    const relVelX = velBx - velAx;
                    const relVelY = velBy - velAy;

                    // Relative velocity along the normal
                    const velAlongNormal = relVelX * nx + relVelY * ny;

                    // Only resolve if objects are moving towards each other
                    if (velAlongNormal < 0) {
                        const restitution = Math.min(a.restitution, b.restitution);

                        // Calculate impulse scalar (j)
                        let j = -(1 + restitution) * velAlongNormal;
                        j /= totalInvMass; // Already calculated inverse mass sum

                        // Apply impulse (change in momentum)
                        const impulseX = j * nx;
                        const impulseY = j * ny;

                        // Apply impulse differently based on object type
                        if (a instanceof VerletObject && !a.pinned) {
                            // Affect position indirectly by changing oldPosition
                            a.oldPosition.x += impulseX * massAInv;
                            a.oldPosition.y += impulseY * massAInv;
                         } else if (!a.pinned) {
                            a.velocity.x -= impulseX * massAInv;
                            a.velocity.y -= impulseY * massAInv;
                         }

                         if (b instanceof VerletObject && !b.pinned) {
                            b.oldPosition.x -= impulseX * massBInv;
                            b.oldPosition.y -= impulseY * massBInv;
                         } else if (!b.pinned) {
                            b.velocity.x += impulseX * massBInv;
                            b.velocity.y += impulseY * massBInv;
                        }
                    }
                }
            }
        }
        // --- TODO: Add Rectangle Collision Detection ---
    }

    // Render step for this particular frame
    render() {
        // Clear canvas
        // Save context state if making global changes
        // this.ctx.save();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw debug grid if enabled
        if (this.debug) {
            this.drawDebugGrid();
        }

        // Render all entities
        for (const entity of this.entities) {
            try {
                 // Pass the GPU instance only if it was successfully created
                entity.render(this.ctx, this.gpu);
            } catch (e) {
                console.error("Error rendering entity:", entity, e);
                // Optionally remove the problematic entity or draw a placeholder
                 this.ctx.fillStyle = 'red';
                 this.ctx.fillRect(entity.position.x - 5, entity.position.y - 5, 10, 10);
            }
        }
         // Restore context state if saved
         // this.ctx.restore();
    }

    // Helper to draw a debug grid
    drawDebugGrid() {
        this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.1)';
        this.ctx.lineWidth = 0.5;
        const gridSize = 50;

        for (let x = 0; x <= this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y <= this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
}

// --- Export Physix and Entity classes if using modules ---
// export { Physix, Entity, Circle, Rectangle, VerletObject };
// For simple script includes, they are now globally available.