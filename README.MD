Hi, this workshop will show you how to transform your local project onto the world wide web. We have an existing careers website where users can apply to a job and upload their resume to which is connected to a local postgres instance and saves files to the local hard drive and want anybody in the world to be able to apply to our job.

Firstly, let's create a Fly account. Fly is a cloud platform for deploying serverless applications. It is entirely free for small services and scales affordably. 

We use it for all of our ten new WDCC projects and are yet to pay a dime. In the future, we are going to transition to using the same technology that powers capstone projects so that we can easily set budgets and monitor the projects while also enabling developers and leads to easily provision their own infrastructure.

Follow the instructions [here](https://fly.io/app/sign-up) to create an account. It will ask for a payment method, which will be required to use the platform unfortunately. If you select the hobby plan it will be free as long as you don't create an organisation.

You can now install the Command Line Interface which is how we interact with the platform. Follow the instructions for your platform [here](https://fly.io/docs/hands-on/install-flyctl/) and when you've installed run this in a terminal to log in
```bash
fly auth login
```

Let's get our app onto your machine. Run
```
git clone https://github.com/UoaWDCC/software-arch-workshop
```
to download our repository to your computer and open it in your code editor.

### Part 1: Frontend

We'll start with the easy part, let's connect the frontend to the backend. If you open `/web/src/main.tsx`, you'll see the code for our react-based frontend. Inspect our `handleSubmit` function which is called when the user presses our Submit button. 

```typescript
  const handleSubmit = () => {
    const submitData = async () => {
      console.log('Submitting');
      if (!resume) return;
      const formData = new FormData();
      formData.append('resume', resume);
      formData.append('fullName', fullName);
      formData.append('email', emailAddress);
      const res = await fetch('http://localhost:3000/apply', {
        method: 'POST',
        body: formData,
      });
      switch (res.status) {
        case 200: {
          setIsSuccess({
            state: 'success',
          });
          break;
        }
        case 400: {
          setIsSuccess({
            state: 'err',
            msg: 'Bad Request',
          });
          break;
        }
        case 500: {
          setIsSuccess({
            state: 'err',
            msg: 'Could not apply',
          });
          break;
        }
      }
    };
    submitData();
  };
  ```
  Inside we write an asynchronous function that calls an endpoint on our backend. We add the data to an instance of `FormData`, including a file called 'resume'. Notice, that our fetch requests the URL `http://localhost:3000`. This isn't going to work when we deploy, so we'll want to change it. We'll change it in three ways:
  - Protocol: When our API is running on the internet we want it to be secure, so we change our local http (hyper-text transfer protcol) to https (hyper text transfer protcol secure 🔒) which means that all of our servers traffic is encrypted so outsiders can't read it.
  - Localhost. Our server will be running somewhere completely different, so we'll want to change the domain to that
  - Port. We can remove the port because we know that it will be the main application running on our machine. When we remove the port, the port is still there, but it is assumed based on the protocol. For HTTP programmes, they are typically run on port 80 and for HTTPS, they are typically run on 443.

In theory our API url will look more like `https://api.wdcc.co.nz` for example. Though instead of just hard-coding this in the fetch again, we'll use environment variables. We use environment variables to easily change information about the app from our cloud platform without having to recompile our code. Change the URL in the `submitData` function to:
```typescript
      const res = await fetch(`${import.meta.env.VITE_API_URL}/apply`, {
        method: 'POST',
        body: formData,
      });
   ```
   This uses our build tool Vite to manage our environment variables. At build time (when you run `yarn run build` or `npm run build`) this will replace the variable with the link. It is required that any environment variable starts with VITE on the frontend, otherwise it won't be accessible in your application unfortunately.
   
   Create a `.env` file inside the web folder and write:
   ```
   VITE_API_URL="http://localhost:3000"
   ```
   
if you want to continue using your app locally for testing. 

### Part 2: Database

We can now move on to the difficult part, changing our API. Our project is already setup to use an environment variable. If you take a look at `api/prisma/schema.prisma` you can see our database schema which outlines a `datasource` which is described to accept our database url through an environment variable.
```typescript
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Prisma is an ORM (Object-Relational Mapper) for interfacing with a database, it's not important for this workshop, but if you aren't familiar with it and are interested, check out [Prisma](https://prisma.io). 

We don't have a database at the moment, so let's create one using Fly. Open up a terminal and run 
```bash
fly postgres create
```
Choose a globally unique name or let it randomly generate one, then select Sydney (SYD) as your region, then select **Development** as your configuration (important if you don't want to be charged) as well as scaling the node to zero after an hour.

This will print out your Connection String which you can use to connect to the database from your code, it should look something like this:
`postgres://postgres:k3vBQq3b3PRtLf9@powerful-wildflower-6985.flycast:5432`
Awesome! You now have a remote postgres database. There is one problem though, this is not accessible to your machine. It is hidden away behind a Virtual Private Cloud. This means it is only accessible to deployed applications and not any machine. This is great for security because it means that other people can't access your database remotely. If we want to use the same database to test locally, we can proxy the database, which means open up a connection for us to use. Remember the name of your app (it should say `Postgres cluster powerful-wildflower-6985 created`, that is your app name) and run this command
```bash
fly proxy 5432:5432 --app powerful-wildflower-6985
```
If it won't let you proxy, you may need to start the database if you chose the development configuration:
```bash
fly machine start --app powerful-wildflower-6985
```

If that doesn't work, you may have a database already running on your machine, you can simply change the port like this, just make sure your remember your new port.
```bash
fly proxy 9999:5432 --app powerful-wildflower-6985
```

You are now welcome to create an `.env` file in the `api` folder and jot down your connection string, though as we are proxying it, we need to adjust it by changing the `powerful-wildflower.flycast` part to `localhost:5432` (or with whatever port you are using) and you are good to go:

```
DATABASE_URL=postgres://postgres:EeRuCGInlfTMibD@localhost:5432
```

Inside your `api` folder run
```bash
yarn install
```
(if you don't have yarn installed run `npm i -g yarn`)
```bash
yarn run build
yarn run start
```

Open a new terminal and, in your web folder, run
```bash
yarn install
yarn run dev
```
Then navigate to `localhost:5173` in your browser and try the app. It should be fully functional and let you successfully apply to a hypothetical job. 

### Part 3: Storage Bucket

We need to somewhere to store the resumes people are uploading on the cloud. At the moment, it is being stored in the `/uploads` folder on our local machine, but we want it to be cloud native and globally accessible. Let's create a bucket. We'll use Tigris which is a Amazon S3 compatible bucket that is integrated with Fly.

```
fly storage create --public
```
This command creates us a public storage bucket that anybody can view the contents of, but only we can upload to. This command should output a list of security variables that we can use to access it from our service. They should look like this:
```
AWS_ACCESS_KEY_ID=tid_OVzeLGJpfkgkhkhbtCVHmTIqnzTAcDcINEPPGPGPYhCyr  
AWS_ENDPOINT_URL_S3=https://fly.storage.tigris.dev
AWS_REGION=auto
AWS_SECRET_ACCESS_KEY=tsec_pFKfkrekb9BVTAqVBEq-+b-ugkgkk4k4fjdEy6b9hwgkgk4iZzXvMjKU
BUCKET_NAME=wonderful-blueberry-3932
```
Let's save these in our `.env` file.

We now need to change our code so that it uses our global system instead of just our local file storage. Run
```
yarn install @aws-sdk/client-s3
```
to install AWS's client for interacting with S3 and add this to the top of your `index.ts` file:
```typescript
import {
  CreateBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
```

Then create your client like this:
```typescript
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
```
Then inside our apply endpoint, add the following code:
```typescript
  async (req: Request, res: Response) => {
    const file = req.file;
    const { fullName, email } = req.body;
    if (!fullName || !email || !file)
      return res.status(400).send('`fullName` and `email` are required fields');

    // Add this
    const fileStream = fs.createReadStream(file.path);

    const uploadParams = {
      Bucket: process.env.BUCKET_NAME,
      Key: file.filename,
      Body: fileStream,
    };
    ```
    We still upload our file to our local storage first, then we create a read stream to read the content for that file, then define what bucket we want to upload to, the unique identifying key of the file which will just be the filename, and then the body which is the read stream.
    
  Then, when we upload the data to the database, also upload the file with this code:
  ```typescript
  
    try {
      await s3Client.send(new PutObjectCommand(uploadParams));

      const resume = `${process.env.AWS_ENDPOINT_URL_S3}/${process.env.BUCKET_NAME}/${file.filename}`;

      const application = await prisma.application.create({
        data: {
          fullName,
          email,
          resume,
        },
      });
      return res.status(200).send(application);
    } catch (err) {
      console.error(err);
      return res.status(500).send('could not create application');
    }
 ```
    
    
    You should be all set to use our remote storage. If you run this locally, it will upload the data to the remote database and file storage.
    
    ### Part 4: Deployment
    
    Let's complete the process by deploying your app to the cloud. Firstly, using your Fly CLI, we'll create the apps for both frontend and backend.
    
    ```
    fly apps create App-Name
    fly apps create App-Name-Api
    ```
  
  Then inside both folders create a `fly.toml`, this is where we will store the configuration information for each service. 
  
  Let's document the config for the API first. We'll have four different sections.
  
  ```toml
  app = "software-arch-workshop-api" # This will be the name of the app you just created in the CLI
  primary_region = 'syd'
```

We then want to define how to build the app, and we'll use a Dockerfile for this. In your `fly.toml` add:
```toml
[build]
  dockerfile = "Dockerfile"
```
this specifies the path for the Dockerfile. We then want to outline how the service runs:
```toml
[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
  processes = ['app']
```
Finally, let's describe the specs of the machine we want our app running on. We'll go with the most basic machine possible
```toml
[[vm]]
  cpu_kind = 'shared'
  cpus = 1
  memory_mb = 1024
```

Your `fly.toml` should, in its entirety, look like this:
```toml
app = "software-arch-workshop-api"
primary_region = 'syd'

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
  processes = ['app']

[[vm]]
  cpu_kind = 'shared'
  cpus = 1
  memory_mb = 1024
```

We now need our Dockerfile, so inside your `api` folder create a file called `Dockerfile` with no file extension and paste this in:
```
# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=20.3.0
FROM node:${NODE_VERSION}-slim as base

LABEL fly_launch_runtime="Node.js/Prisma"

# Node.js/Prisma app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"
ARG YARN_VERSION=1.22.19
RUN npm install -g yarn@$YARN_VERSION --force


# Throw-away build stage to reduce size of final image
FROM base as build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp openssl pkg-config python-is-python3

# Install node modules
COPY --link package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false

# Generate Prisma Client
COPY --link prisma .
RUN yarn prisma generate

# Copy application code
COPY --link . .

# Build application
RUN yarn run build

# Remove development dependencies
RUN yarn install --production=true

# Final stage for app image
FROM base

# Install packages needed for deployment
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y openssl && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD [ "yarn", "run", "start" ]
```
This shows the container manager, step by step, how to install and run our application. You can generally get GPT to write this, but to teach the exact way to write this is a little more complicated and outside of the scope of this workshop.

Now let's set our secret environment variables. You can set a secret for your fly project with:
```bash
fly secrets set DATABASE_URL="postgres://postgres:password@app.internal:5432" --stage
```
So go through all of the environment variables inside your env file and save them as secrets using this command. Note: for your database URL make sure you are not using the localhost one, and also change `flycast` to `internal` as this is likely to cause problems otherwise.

Now to deploy, cd into api if you haven't already then run
```bash
fly deploy
```

For the web, create a `fly.toml`:
```toml
app = 'software-arch-workshop'
primary_region = 'syd'

[http_service]
  internal_port = 80
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
  processes = ['app']

[[vm]]
  memory = '1gb'
  cpu_kind = 'shared'
  cpus = 1
```
and the Dockerfile:
```
# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=20.3.0
FROM node:${NODE_VERSION}-slim as base

LABEL fly_launch_runtime="Vite"

# Vite app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"
ARG YARN_VERSION=1.22.19
RUN npm install -g yarn@$YARN_VERSION --force

# Throw-away build stage to reduce size of final image
FROM base as build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Install node modules
COPY --link package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false

# Copy application code
COPY --link . .

ENV VITE_API_URL="https://software-arch-workshop-api.fly.dev"

# Build application
RUN yarn run build

# Remove development dependencies
RUN yarn install --production=true


# Final stage for app image
FROM nginx

# Copy built application
COPY --from=build /app/dist /usr/share/nginx/html

# Start the server by default, this can be overwritten at runtime
EXPOSE 80
CMD [ "/usr/sbin/nginx", "-g", "daemon off;" ]
```

Notice that we've added our build time environment variables in here such as VITE_API_URL just before we ask Docker to run the build command. 

  
  

