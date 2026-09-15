#!/usr/bin/env python3
"""Attach or verify an Ed25519 signature over an evidence package payload hash."""
import argparse, base64, json, sys
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey

def main():
    p=argparse.ArgumentParser(); p.add_argument('mode',choices=('sign','verify')); p.add_argument('--evidence',required=True); p.add_argument('--key',required=True); p.add_argument('--key-id',default=''); a=p.parse_args()
    with open(a.evidence,encoding='utf-8') as f: package=json.load(f)
    digest=package['integrity']['payload_sha256'].encode('ascii')
    if a.mode=='sign':
        with open(a.key,'rb') as f: key=serialization.load_pem_private_key(f.read(),password=None)
        if not isinstance(key,Ed25519PrivateKey): raise TypeError('Ed25519 private key required')
        package['signature']={'algorithm':'Ed25519','key_id':a.key_id,'signed_field':'integrity.payload_sha256','signature_base64':base64.b64encode(key.sign(digest)).decode('ascii')}
        with open(a.evidence,'w',encoding='utf-8') as f: json.dump(package,f,indent=2); f.write('\n')
        return 0
    with open(a.key,'rb') as f: key=serialization.load_pem_public_key(f.read())
    if not isinstance(key,Ed25519PublicKey): raise TypeError('Ed25519 public key required')
    try: key.verify(base64.b64decode(package['signature']['signature_base64']),digest)
    except Exception: print('SIGNATURE INVALID'); return 2
    print('SIGNATURE VALID'); return 0
if __name__=='__main__': sys.exit(main())
