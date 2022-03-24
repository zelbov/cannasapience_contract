FROM postgres:latest  

COPY ./init-db.sql /docker-entrypoint-initdb.d/

# openssl req -new -text -passout pass:abcd -subj /CN=10.5.1.6 -out server.req -keyout privkey.pem
# openssl rsa -in privkey.pem -passin pass:abcd -out server.key
# openssl req -x509 -in server.req -text -key server.key -out server.crt

COPY server.crt /server.crt
COPY server.key /server.key

RUN chmod 600 /server.crt && chown postgres /server.crt
RUN chmod 600 /server.key && chown postgres /server.key

EXPOSE 5432

CMD [ \
    "postgres", \
    "-c", \
    "ssl=on", \ 
    "-c", \
    "ssl_cert_file=/server.crt", \
    "-c", \
    "ssl_key_file=/server.key" \
]
