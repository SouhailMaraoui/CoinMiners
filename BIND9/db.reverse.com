
; BIND reverse data file for local loopback interface
;
$TTL	604800
@	IN	SOA	ns.coinminers.com. root.localhost. (
			      1		; Serial
			 604800		; Refresh
			  86400		; Retry
			2419200		; Expire
			 604800 )	; Negative Cache TTL
;
@	IN	NS	ns.
2	IN	PTR	ns.kev.com.
2	IN	PTR	www.coinminers.com
3	IN	PTR	mail.coinminers.com
4	IN	PTR 	admin.coinminers.com
