# PhysixJS: A GPU accelerated physics engine
PhysixJS is 2D physics engine built from the ground up in JavaScript, designed to run directly in the browser, I started it as my "passion project" and kept working on it since last year. Its primary goal is to implement GPU acceleration for physics simulations, leveraging the capabilities of the GPU.js library. As of now, PhysixJS can simulate basic 2D shapes like circles and rectangles, manage fundamental physics interactions such as gravity and velocity updates, and utilizes GPU.js to speed up the rendering process for larger shapes. 

Currently, this implementation is lacking because of implementing the actual logic on the CPU and not the GPU, which (fundamentally) limits its performance scaling for complex scenes. GPU.js is (hopefully) cleverly employed to accelerate the rendering of larger individual shapes, the core physics computations – determining which of potentially many objects are colliding, calculating the intricate forces and impulses needed for realistic responses, and solving constraints for systems like cloth – are all executed sequentially on the main processor which is not optimal at all. This CPU-bound approach means that as the number of interacting entities grows, the simulation speed becomes increasingly bottlenecked by the CPU's processing power, preventing the massive parallel speedups that true GPU acceleration of the physics calculations themselves could offer for handling vast numbers of objects simultaneously.

I've reached a point of fatigue with this specific project and will not be actively developing it further myself, particularly as well-established and feature-rich engines like Matter.js already provide robust (and more mature) solutions, making it challenging for this project to offer significantly new advantages at its current stage. However, the foundation laid here, particularly the integration attempts with GPU.js and the basic physics structures, might be of interest to others. If you find PhysixJS intriguing and wish to build upon it, fix issues, or add new features (like enhanced collision detection, rotation, or deeper GPU physics integration), please feel free to fork the repository and submit pull requests.

TLDR: This engine is named Physix with an 'x' because it sounds cool

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

## Main TODO: Implement a frontend for this project
Create a frontend to replace playground.js and make it more interactive