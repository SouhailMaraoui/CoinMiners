#Clear previously generated keys and certs.
FILE=cert.pem
if test -f "$FILE"; then
    rm 00.pem req.pem cert.pem index.txt index.txt.attr key.pem serie
    mv index.txt.old index.txt
    mv serie.old serie 
fi

#Generate a key
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out key.pem
#Create a certificat request 
openssl req -new -key key.pem -out req.pem -config gei761.conf
#Sign the certificat request
openssl ca -in req.pem -out cert.pem -config gei761.conf

read -p "Press enter to continue"