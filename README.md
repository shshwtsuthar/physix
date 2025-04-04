# PhysixJS: A GPU accelerated physics engine for the web
PhysixJS is 2D physics engine built from the ground up in JavaScript, designed to run directly in the browser, I started it as my "passion project" and kept working on it since last year. Its primary goal is to implement GPU acceleration for physics simulations, leveraging the capabilities of the GPU.js library. As of now, PhysixJS can simulate basic 2D shapes like circles and rectangles, manage fundamental physics interactions such as gravity and velocity updates, and utilizes GPU.js to speed up the rendering process for larger shapes. 

Currently, this implementation is lacking because of implementing the actual logic on the CPU and not the GPU, which (fundamentally) limits its performance scaling for complex scenes. GPU.js is (hopefully) cleverly employed to accelerate the rendering of larger individual shapes, the core physics computations – determining which of potentially many objects are colliding, calculating the intricate forces and impulses needed for realistic responses, and solving constraints for systems like cloth – are all executed sequentially on the main processor which is not optimal at all. This CPU-bound approach means that as the number of interacting entities grows, the simulation speed becomes increasingly bottlenecked by the CPU's processing power, preventing the massive parallel speedups that true GPU acceleration of the physics calculations themselves could offer for handling vast numbers of objects simultaneously.

I've reached a point of fatigue with this specific project and will not be actively developing it further myself, particularly as well-established and feature-rich engines like Matter.js already provide robust (and more mature) solutions, making it challenging for this project to offer significantly new advantages at its current stage. However, the foundation laid here, particularly the integration attempts with GPU.js and the basic physics structures, might be of interest to others. If you find PhysixJS intriguing and wish to build upon it, fix issues, or add new features (like enhanced collision detection, rotation, or deeper GPU physics integration), please feel free to fork the repository and submit pull requests.

**TLDR: This engine is named Physix with an 'x' because it sounds cool**

## TODOs
### 1. Rectangle Collision Detection 
Implement collision detection between two Rectangle entities and between a Rectangle and a Circle/VerletObject (refer SAT - Seperating Axis Theorem)

### 2. Rectangle Collision Response
Calculate and apply appropriate impulses/positional corrections when rectangles collide. The impulse calculation needs to consider the collision point and the normal at that point (which comes from the SAT result).

### 3. Rotational Physics
Allow entities to rotate to have cool tumbling boxes and spinning wheels.
Skeletal approach:
Add new properties to Entity: angle (current rotation), angularVelocity, angularAcceleration, torque (rotational force), inertia (rotational equivalent of mass).
Modify applyForce: Forces applied off-center will generate torque.
Update update (Euler): Integrate angular acceleration -> angular velocity -> angle.
Update collision response: Collisions will generate impulses that affect both linear and angular velocity. The point of collision matters.
Update rendering: Draw entities (Rectangle) rotated by their current angle.

### 4. Optimizations

### 5. Add more shapes
Add support for more polygons 

### 6. Raycasting
Cool raycasting for line of sight checks 

## 7. Rework main logic and computations and handle it with the GPU instead of the CPU

## Main TODO: Implement a frontend for this project
Create a frontend to replace playground.js and make it more interactive

# Verlet Integration
Imagine trying to predict where a ball will be next. Instead of constantly tracking its exact speed (which can get complicated and lead to small errors adding up), the Verlet method uses a clever trick. It looks at where the ball is right now and where it was just a moment ago. The difference between those two tells you roughly which way it was going and how fast. Then, it uses that information, plus any current pushes or pulls (like gravity), to figure out where the ball will be in the next moment. It's like saying, "Okay, you moved this much in the last step, so you'll probably move about the same amount again, plus a little extra for any forces acting on you." This approach turns out to be surprisingly stable and works really well for things connected by springs or strings (like the cloth simulation), keeping them from accidentally stretching or bouncing wildly out of control.

The `VerletObject` class utilizes **Position Verlet integration**, a numerical method often favored in physics simulations for its excellent stability (especially with constraints) and good energy conservation compared to simpler Euler methods. Instead of explicitly storing and integrating velocity, it calculates an object's next position, ${p}_{n+1}$, based on its current position, ${p}_n$, its *previous* position, ${p}_{n-1}$, and the current acceleration ${a}_n$ over a time step $\Delta t$. The core formula is:

${p}_{n+1} = {p}_n + ({p}_n - {p}_{n-1}) + {a}_n (\Delta t)^2$

Here, the term $({p}_n - {p}_{n-1})$ implicitly represents the object's current velocity scaled by $\Delta t$. In the code's `updatePosition` method, `this.position` corresponds to ${p}_n$, `this.oldPosition` corresponds to ${p}_{n-1}$, and `this.verletAcceleration` provides ${a}_n$. Friction or damping is typically applied by scaling the implicit velocity term $({p}_n - {p}_{n-1})$ before adding it. This reliance on positions makes it particularly well-suited for enforcing distance constraints, as seen in the cloth simulation example, because constraint corrections directly adjust positions, which neatly fits into the Verlet update cycle.
