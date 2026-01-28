### Docker Advanced Concept

1. Multi-stage Docker / Distroless
2. Docker hub (push / tag / pull) 
3. Docker volume (storage MySQL)
4. Docker networking
5. Docker compose
6. Docker scout


#### Optimize the image
- Slim image
- Distroless images (No linux distribution)
*Distroless* images contain only your application and its runtime dependency.
    - gcr distroless (google container register)

Multi-Stage (jitne FROM utne stage)
```docker
# STAGE 1 

FROM python:3.9-slim AS builder

WORKDIR /app 

COPY . .

RUN pip install -r requirements.txt --target=/app/deps



# STAGE 2 

FROM gcr.io/distroless/python3-debian12

WORKDIR /app 

COPY --from=builder /app/deps /app/deps 
COPY --from=builder /app      .

ENV PYTHONPATH="/app/deps"

EXPOSE 80

CMD ["python","run.py"]
```


Understanding Multistage dockerfile 
- Stage 1: (where we have a slim image with linux distribution)
- AS : alias for the stage 
- Stage 2: where we will have just the code and code dependencies without linux distrobution

> Building Multistage docker file 
>> `docker build -f ./Dockerfile-multi-stage -t python-app-mini .`







### Docker Tag 
> Remove all container without system prune command 
>> `docker ps -aq` --> Will give only container id.
>> `docker rm $(docker ps -aq)`
>> `docker images -aq`
>> `docker rmi $(docker images -aq)`

Push the image to docker hub account
> `docker image tag python-app-mini:latest <account-name>/python-app-mini:latest`
> `docker push <account-name>/python-app-mini:latest`

> `docker pull mysql`


### Docker Volume 
MySQL is database server, that why it need username, password.
> `docker run -d -e MYSQL_ROOT_PASSWORD=root mysql:latest`
- `e` --> Environment Variable

Get inside the container
> `docker exec -it 397f bash`

> `mysql -u root -p`


Show volume 
> `docker volume ls`

Create Volume 
> `docker volume create mysql-data`

Inspect Docker Volume (it will where it is mounted on host machine)
> `docker inspect mysql-data`


Map Volume 
> `docker run -d -e MYSQL_ROOT_PASSWORD=root -v mysql-data:/var/lib/mysql mysql:latest`


Logs 
> `docker logs <container-id>`

Make sure that the volumes is not empty by defaults from host side, otherwise it will create empty folder in docker path, if the particular executable are their.
> `docker run -d -p 80:80 /home/$USER/volumes:/app/db python-app`


### Docker Networking
Check network of a container
`docker inspect <container-id>`
    - You need to check, network it will have it's own bridge connection, ip address, network id etc.

List networks
> `docker network ls`

Delete a network
> `docker network rm <network-id>`

Docker Network 
1. Bridge 
2. None 
3. Host (jo host ka network hoga vhi docker network hoga)
4. User defined bridge
5. MAC VLAN  
6. IP VLAN 
7. Overlay 


Create a Network 
> `docker network create <name>` (user defined network)

In this bridge network, the container name is the DNS name to identify the container

Specify network to container 
> `docker run -d --name mysql -v mysql-date:/var/lib/mysql --network=twotier -e MYSQL_PASSWORD admin -e MYSQL_USER=admin -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=tws_db -p 3306:3306 mysql:latest`

for flask app 
> `docker run -d -p 5000:5000 --network=twotier --name flaskapp -e .... flask-app:latest`

Make sure the environment variable are properly assigned.

### Docker Compose 

yml is a configuration file. key: value 


```yml
services:
 mysql:
   image: mysql:5.7
   container_name: mysql
   environment:
    MYSQL_PASSWORD: admin 
    MYSQL_USER: admin 
    MYSQL_ROOT_PASSWORD: admin 
    MYSQL_DATABASE: tws_db 
   volumes: # Yaha pr use kiya hain
    - mysql-data-new:/var/lib/mysql 
   networks:
    - twotier
   ports:
    - "3306:3306"
   healthcheck:
    -
  flaskapp:
    build:
      context: .
    container_name: flaskapp 
    environment:
      MYSQL_HOST: mysql 
      MYSQL_USER: root
      MYSQL_PASSWORD: admin
      MYSQL_DB: tws_db
    networks:
     - twotier
    ports:
     - "5000:5000"
    depends_on:
     - mysql
    restart: always


volumes: # Ye wala volume create kiya hain
  mysql-data-new:
        
networks:
  twotier:
```




### Docker Scout 
Docker Scout scans your container images and tells you:
    Are there known security vulnerabilities inside this image, and how bad are they?
Image vulnerabilities & SBOM
```
docker scout version
docker scout login
docker scout quickview pokemon-api
docker scout cves pokemon-api
docker scout cves pokemon-api --only-severity critical
docker scout recommendations pokemon-api
```
