#!/usr/bin/env python3
import argparse, datetime, hashlib, json, sys, uuid

ALLOWED_RESULTS={"TECHNICAL VERIFICATION SATISFIED","TECHNICAL VERIFICATION NOT SATISFIED","EVIDENCE REQUIRED"}
def canonical_bytes(value): return json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=False).encode()
def load(path):
    with open(path,encoding="utf-8") as f: return json.load(f)
def compare(expected,observed):
    exp={x["identity"]:x for x in expected.get("functions",[])}
    obs={x["identity"]:x for x in observed.get("functions",[])}
    mismatches=[]
    for identity in sorted(set(exp)|set(obs)):
        if identity not in obs: mismatches.append({"identity":identity,"kind":"MISSING_FUNCTION","expected":exp[identity],"observed":None}); continue
        if identity not in exp: mismatches.append({"identity":identity,"kind":"UNEXPECTED_FUNCTION","expected":None,"observed":obs[identity]}); continue
        for field in ("owner","security_mode","definition_md5","expected_schema_roles_with_usage","expected_execute_roles"):
            observed_field={"expected_execute_roles":"execute_roles","expected_schema_roles_with_usage":"schema_roles_with_usage"}.get(field,field)
            if exp[identity].get(field)!=obs[identity].get(observed_field):
                mismatches.append({"identity":identity,"kind":"FIELD_MISMATCH","field":observed_field,"expected":exp[identity].get(field),"observed":obs[identity].get(observed_field),"classification":exp[identity].get("classification")})
    return mismatches
def main():
    p=argparse.ArgumentParser(); p.add_argument("--expected",required=True); p.add_argument("--observed",required=True); p.add_argument("--output",required=True); a=p.parse_args()
    try:
        expected,observed=load(a.expected),load(a.observed); mismatches=compare(expected,observed)
        result="TECHNICAL VERIFICATION SATISFIED" if not mismatches else "TECHNICAL VERIFICATION NOT SATISFIED"
    except Exception as exc:
        observed={}; mismatches=[{"kind":"EVIDENCE_ERROR","detail":str(exc)}]; result="EVIDENCE REQUIRED"
    package={"evidence_schema_version":"1.0.0","contract_version":"1.0.0","environment_id":observed.get("environment_id","UNKNOWN"),"baseline_reference":observed.get("baseline_reference","UNKNOWN"),"collector_version":observed.get("collector_version","UNKNOWN"),"comparator_version":"1.0.0","generated_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"correlation_id":observed.get("correlation_id",str(uuid.uuid4())),"result":result,"mismatch_count":len(mismatches),"mismatches":mismatches}
    package["integrity"]={"algorithm":"SHA-256","payload_sha256":hashlib.sha256(canonical_bytes(package)).hexdigest()}
    with open(a.output,"w",encoding="utf-8") as f: json.dump(package,f,indent=2); f.write("\n")
    print(f"{result}: {len(mismatches)} mismatch(es)")
    return 0 if result=="TECHNICAL VERIFICATION SATISFIED" else 2
if __name__=="__main__": sys.exit(main())
