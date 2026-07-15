const MAX_REFERENCE_DISTANCE = 9;

// Spring HtmlUtils 6.2.x loads this exact HTML 4 entity set. Keeping the compact table here
// avoids a general-purpose HTML parser while preserving case-sensitive provider semantics.
const HTML4_ENTITY_TABLE = [
  "nbsp:a0,iexcl:a1,cent:a2,pound:a3,curren:a4,yen:a5,brvbar:a6,sect:a7,uml:a8,copy:a9,ordf:aa,laquo:ab,not:ac,shy:ad,reg:ae,macr:af",
  "deg:b0,plusmn:b1,sup2:b2,sup3:b3,acute:b4,micro:b5,para:b6,middot:b7,cedil:b8,sup1:b9,ordm:ba,raquo:bb,frac14:bc,frac12:bd,frac34:be,iquest:bf",
  "Agrave:c0,Aacute:c1,Acirc:c2,Atilde:c3,Auml:c4,Aring:c5,AElig:c6,Ccedil:c7,Egrave:c8,Eacute:c9,Ecirc:ca,Euml:cb,Igrave:cc,Iacute:cd,Icirc:ce,Iuml:cf",
  "ETH:d0,Ntilde:d1,Ograve:d2,Oacute:d3,Ocirc:d4,Otilde:d5,Ouml:d6,times:d7,Oslash:d8,Ugrave:d9,Uacute:da,Ucirc:db,Uuml:dc,Yacute:dd,THORN:de,szlig:df",
  "agrave:e0,aacute:e1,acirc:e2,atilde:e3,auml:e4,aring:e5,aelig:e6,ccedil:e7,egrave:e8,eacute:e9,ecirc:ea,euml:eb,igrave:ec,iacute:ed,icirc:ee,iuml:ef",
  "eth:f0,ntilde:f1,ograve:f2,oacute:f3,ocirc:f4,otilde:f5,ouml:f6,divide:f7,oslash:f8,ugrave:f9,uacute:fa,ucirc:fb,uuml:fc,yacute:fd,thorn:fe,yuml:ff",
  "fnof:192,Alpha:391,Beta:392,Gamma:393,Delta:394,Epsilon:395,Zeta:396,Eta:397,Theta:398,Iota:399,Kappa:39a,Lambda:39b,Mu:39c,Nu:39d,Xi:39e,Omicron:39f",
  "Pi:3a0,Rho:3a1,Sigma:3a3,Tau:3a4,Upsilon:3a5,Phi:3a6,Chi:3a7,Psi:3a8,Omega:3a9,alpha:3b1,beta:3b2,gamma:3b3,delta:3b4,epsilon:3b5,zeta:3b6,eta:3b7",
  "theta:3b8,iota:3b9,kappa:3ba,lambda:3bb,mu:3bc,nu:3bd,xi:3be,omicron:3bf,pi:3c0,rho:3c1,sigmaf:3c2,sigma:3c3,tau:3c4,upsilon:3c5,phi:3c6,chi:3c7",
  "psi:3c8,omega:3c9,thetasym:3d1,upsih:3d2,piv:3d6,bull:2022,hellip:2026,prime:2032,Prime:2033,oline:203e,frasl:2044,weierp:2118,image:2111,real:211c,trade:2122,alefsym:2135",
  "larr:2190,uarr:2191,rarr:2192,darr:2193,harr:2194,crarr:21b5,lArr:21d0,uArr:21d1,rArr:21d2,dArr:21d3,hArr:21d4,forall:2200,part:2202,exist:2203,empty:2205,nabla:2207",
  "isin:2208,notin:2209,ni:220b,prod:220f,sum:2211,minus:2212,lowast:2217,radic:221a,prop:221d,infin:221e,ang:2220,and:2227,or:2228,cap:2229,cup:222a,int:222b",
  "there4:2234,sim:223c,cong:2245,asymp:2248,ne:2260,equiv:2261,le:2264,ge:2265,sub:2282,sup:2283,nsub:2284,sube:2286,supe:2287,oplus:2295,otimes:2297,perp:22a5",
  "sdot:22c5,lceil:2308,rceil:2309,lfloor:230a,rfloor:230b,lang:2329,rang:232a,loz:25ca,spades:2660,clubs:2663,hearts:2665,diams:2666,quot:22,amp:26,#39:27,lt:3c",
  "gt:3e,OElig:152,oelig:153,Scaron:160,scaron:161,Yuml:178,circ:2c6,tilde:2dc,ensp:2002,emsp:2003,thinsp:2009,zwnj:200c,zwj:200d,lrm:200e,rlm:200f,ndash:2013",
  "mdash:2014,lsquo:2018,rsquo:2019,sbquo:201a,ldquo:201c,rdquo:201d,bdquo:201e,dagger:2020,Dagger:2021,permil:2030,lsaquo:2039,rsaquo:203a,euro:20ac"
] as const;

const HTML4_NAMED_ENTITIES: ReadonlyMap<string, string> = new Map(
  HTML4_ENTITY_TABLE.flatMap((group) => group.split(",")).map((entry) => {
    const separator = entry.indexOf(":");
    const name = entry.slice(0, separator);
    const codePoint = Number.parseInt(entry.slice(separator + 1), 16);
    return [name, String.fromCodePoint(codePoint)] as const;
  })
);

const HTML_TAG = /<[^>]*>/gu;
const UNICODE_WHITE_SPACE = /\p{White_Space}+/gu;
const DECIMAL_REFERENCE = /^[+-]?\d+$/u;
const HEX_REFERENCE = /^[+-]?[0-9a-f]+$/iu;

export function naverPlainText(value: string): string {
  const normalized = decodeHtmlEntities(value)
    .replace(HTML_TAG, " ")
    .replace(UNICODE_WHITE_SPACE, " ");
  return stripCollapsedWhitespace(normalized);
}

function decodeHtmlEntities(value: string): string {
  if (!value.includes("&")) return value;

  let decoded = "";
  let cursor = 0;
  while (cursor < value.length) {
    const referenceStart = value.indexOf("&", cursor);
    if (referenceStart < 0) {
      decoded += value.slice(cursor);
      break;
    }
    decoded += value.slice(cursor, referenceStart);

    const referenceEnd = boundedSemicolon(value, referenceStart);
    if (referenceEnd < 0) {
      decoded += "&";
      cursor = referenceStart + 1;
      continue;
    }

    const reference = value.slice(referenceStart, referenceEnd + 1);
    decoded += decodeReferenceOrPreserve(reference);
    cursor = referenceEnd + 1;
  }
  return decoded;
}

function boundedSemicolon(value: string, referenceStart: number): number {
  const lastPossibleEnd = Math.min(value.length - 1, referenceStart + MAX_REFERENCE_DISTANCE);
  for (let index = referenceStart + 1; index <= lastPossibleEnd; index += 1) {
    if (value[index] === ";") return index;
  }
  return -1;
}

function decodeReferenceOrPreserve(reference: string): string {
  const body = reference.slice(1, -1);
  if (!body.startsWith("#")) {
    return HTML4_NAMED_ENTITIES.get(body) ?? reference;
  }

  const hexadecimal = body[1] === "x" || body[1] === "X";
  const digits = body.slice(hexadecimal ? 2 : 1);
  if (!(hexadecimal ? HEX_REFERENCE : DECIMAL_REFERENCE).test(digits)) return reference;

  const codePoint = Number.parseInt(digits, hexadecimal ? 16 : 10);
  if (!Number.isSafeInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
    return reference;
  }
  return String.fromCodePoint(codePoint);
}

function stripCollapsedWhitespace(value: string): string {
  const start = value.startsWith(" ") ? 1 : 0;
  const end = value.endsWith(" ") ? value.length - 1 : value.length;
  return value.slice(start, Math.max(start, end));
}
