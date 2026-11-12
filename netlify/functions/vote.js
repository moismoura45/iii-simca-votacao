const PHOTOS = [
  {id:'P1',category:'P',title:'Muros de memória: a pedra que os escravizados deixaram',author:'Camila Vieira do Carmo',year:2019},
  {id:'P2',category:'P',title:'Oásis do Cerrado',author:'Vanessa Fernandes Ferreira',year:2024},
  {id:'P3',category:'P',title:'Véu de Luz sobre o Prata',author:'Lazaro Nikael Araujo Oliveira',year:2024},
  {id:'P4',category:'P',title:'Pôr do sol em Belterra',author:'Mateus Oliveira Rocha',year:2026},
  {id:'P5',category:'P',title:'Quando o céu se despede, a terra floresce em diversidade',author:'Maria Raimunda de França Sousa',year:2026},
  {id:'P6',category:'P',title:'Amanhecer',author:'Neuriane Pinheiro Ferreira Alves',year:2026},
  {id:'B1',category:'B',title:'Engenharia Epifítica no Ecótono Amazônico',author:'Lazaro Nikael Araujo Oliveira',year:2026},
  {id:'B2',category:'B',title:'O Azul dos Thraupis',author:'Mateus Oliveira Rocha',year:2026},
  {id:'B3',category:'B',title:'Em cada espiral, a geometria da vida.',author:'Maria Raimunda de França Sousa',year:2026},
  {id:'B4',category:'B',title:'Banquete de pólen',author:'Grazieli Brito da Silva',year:2025},
  {id:'B5',category:'B',title:'População de Tropidacris collaris',author:'Agnael Mendes de Oliveira',year:2023},
  {id:'B6',category:'B',title:'Vida Flutuante',author:'Neuriane Pinheiro Ferreira Alves',year:2026}
];
const START = Date.parse('2026-11-12T11:00:00Z');
const END = Date.parse('2026-11-13T21:00:00Z');
const reply = (statusCode, body, headers={}) => ({statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers},body:JSON.stringify(body)});
exports.handler = async (event) => {
  if(event.httpMethod==='GET') {
    const url = (process.env.SUPABASE_URL||'').replace(/\/$/,'');
    return reply(200,{photos:PHOTOS.map(p=>({...p,image:url?`${url}/storage/v1/object/public/fotografias-simca/${p.id}.jpg`:null})),start:'2026-11-12T11:00:00Z',end:'2026-11-13T21:00:00Z',configured:!!url});
  }
  if(event.httpMethod!=='POST')return reply(405,{error:'Método não permitido.'},{Allow:'GET, POST'});
  const now=Date.now();
  if(now<START)return reply(403,{error:'A votação ainda não começou.'});
  if(now>=END)return reply(403,{error:'A votação foi encerrada.'});
  if((event.body||'').length>3000)return reply(413,{error:'Dados muito grandes.'});
  let body;try{body=JSON.parse(event.body||'{}')}catch{return reply(400,{error:'Dados inválidos.'})}
  const name=String(body.name||'').trim().replace(/\s+/g,' ');
  const email=String(body.email||'').trim().toLowerCase();
  const photoId=String(body.photoId||'');
  const photo=PHOTOS.find(p=>p.id===photoId);
  if(name.length<3||name.length>150||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||!photo)return reply(400,{error:'Confira nome, e-mail e fotografia.'});
  if(body.website)return reply(400,{error:'Solicitação inválida.'});
  const url=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const key=process.env.SUPABASE_SECRET_KEY;
  if(!url||!key)return reply(503,{error:'O sistema ainda não foi configurado.'});
  try {
    const response=await fetch(`${url}/rest/v1/votos`,{
      method:'POST',
      headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=minimal'},
      body:JSON.stringify({nome_completo:name,email,categoria_id:photo.category,fotografia_id:photo.id})
    });
    if(response.ok)return reply(201,{message:'Voto registrado com sucesso!'});
    const detail=await response.json().catch(()=>({}));
    if(response.status===409||detail.code==='23505')return reply(409,{error:'Este e-mail já votou nesta categoria.'});
    console.error('Supabase vote insert failed',response.status,detail.code,detail.message);
    return reply(500,{error:'Não foi possível registrar o voto. Avise a organização.'});
  }catch(e){console.error('Vote network failure',e.message);return reply(503,{error:'Serviço temporariamente indisponível.'})}
};
