const STORAGE='kotoba-books-v1';
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let saved={};
try{saved=JSON.parse(localStorage.getItem(STORAGE)||'{}')||{}}catch{}
let level=['N1','N2'].includes(saved.level)?saved.level:'N2';
let records=saved.records&&typeof saved.records==='object'?saved.records:{};
let day=null,mode='full',flipped=false,storageFailed=false;
const $=s=>document.querySelector(s);
const theme={N1:['#3c345b','#edeaf4','#50436f'],N2:['#173e33','#e5eee9','#245645'],N3:['#204764','#e6edf3','#305d7a']};
function dayWords(l,d){return WORDS[l].slice((d-1)*50,d*50)}
function record(l,d){const key=`${l}-${d}`;let r=records[key];if(!r||typeof r!=='object'){r={rounds:0,review:[],full:null,practice:null};records[key]=r}if(!Array.isArray(r.review))r.review=[];return r}
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify({level,records}));storageFailed=false}catch{storageFailed=true;$('#notice').textContent='이 브라우저에서 저장할 수 없습니다. 창을 닫으면 기록이 사라질 수 있습니다.'}}
function setTheme(){['--accent','--tint','--book'].forEach((k,i)=>document.documentElement.style.setProperty(k,theme[level][i]))}
function chooseLevel(l){if(!WORDS[l])throw new Error('지원하지 않는 급수입니다.');level=l;day=null;flipped=false;persist();render()}
function home(){day=null;flipped=false;render();window.scrollTo({top:0,behavior:'instant'})}
function makeSession(ids){return {ids:[...ids],index:0,answers:{},done:false}}
function openDay(d,kind='full'){
 if(!Number.isInteger(d)||d<1||d>Math.ceil(WORDS[level].length/50))throw new Error('없는 Day입니다.');
 if(!['full','review'].includes(kind))throw new Error('잘못된 학습 방식입니다.');
 const r=record(level,d);
 if(kind==='review'){
  if(!r.review.length)throw new Error('복습할 카드가 없습니다.');
  if(!r.practice||r.practice.done)r.practice=makeSession(dayWords(level,d).filter(w=>r.review.includes(w.id)).map(w=>w.id));
 }else if(!r.full)r.full=makeSession(dayWords(level,d).map(w=>w.id));
 day=d;mode=kind;flipped=false;persist();render();window.scrollTo({top:0,behavior:'instant'});
}
function session(){if(day===null)return null;const r=record(level,day);return mode==='full'?r.full:r.practice}
function currentWord(){const s=session();return s&&!s.done?WORDS[level].find(w=>w.id===s.ids[s.index]):null}
function flip(){const s=session();if(!s||s.done)return;flipped=!flipped;render()}
function classify(value){
 if(!['known','review'].includes(value))throw new Error('외움 또는 복습하기를 선택하세요.');
 const s=session(),w=currentWord();if(!s||s.done||!w||!flipped)throw new Error('먼저 카드를 뒤집어 확인하세요.');
 const r=record(level,day);s.answers[w.id]=value;if(mode==='full')r.practice=null;
 if(value==='review'){if(!r.review.includes(w.id))r.review.push(w.id)}else r.review=r.review.filter(id=>id!==w.id);
 if(s.index===s.ids.length-1){s.done=true;if(mode==='full')r.rounds++;}else s.index++;
 flipped=false;persist();render();
}
function previous(){const s=session();if(s&&!s.done&&s.index>0){s.index--;flipped=false;persist();render()}}
function restart(){const r=record(level,day);r.full=makeSession(dayWords(level,day).map(w=>w.id));mode='full';flipped=false;persist();render()}
function shuffleRemaining(){
 const s=session();if(!s||s.done)return;
 const start=flipped?s.index+1:s.index;
 if(s.ids.length-start<2)throw new Error('섞을 카드가 2장 이상 남아 있어야 합니다.');
 for(let i=s.ids.length-1;i>start;i--){const j=start+Math.floor(Math.random()*(i-start+1));[s.ids[i],s.ids[j]]=[s.ids[j],s.ids[i]]}
 persist();render();$('#notice').textContent='남은 카드 순서를 섞었습니다.';setTimeout(()=>{if(!storageFailed)$('#notice').textContent=''},1800);
}
function render(){setTheme();if(day===null)renderShelf();else renderReader()}
function renderShelf(){
 const totalDays=Math.ceil(WORDS[level].length/50);let completed=0;
 const books=Array.from({length:totalDays},(_,i)=>{
  const d=i+1,r=record(level,d),s=r.full,n=s?Object.keys(s.answers).length:0,size=dayWords(level,d).length;
  if(r.rounds>0)completed++;
  const subtitle=s&&!s.done?`${s.index+1}번째 카드부터 이어보기`:r.rounds?`${r.rounds}회독 완료 · 다시 학습`:'아직 시작하지 않았어요';
  return `<article class="book-wrap"><button class="book" data-open="${d}" aria-label="${level} Day ${d}, ${r.rounds}회독 완료, ${subtitle}"><span class="book-label">JLPT ${level}</span><span class="day-word">Day</span><span class="day-number">${String(d).padStart(2,'0')}</span><span class="book-bottom"><strong>${r.rounds}회독 완료</strong><span>${size} WORDS</span></span></button><div class="book-meta"><span>${s&&!s.done?'진행 중':r.rounds?'학습 완료':'시작 전'}</span><span>${n} / ${size}</span></div><div class="progress"><i style="width:${n/size*100}%"></i></div>${r.review.length?`<div class="review-row"><button class="pill" data-review="${d}">복습하기 <strong>${r.review.length}</strong></button></div>`:''}</article>`;
 }).join('');
 $('#app').innerHTML=`<div class="topline"><div><div class="eyebrow">MY LITTLE BOOKSHELF</div><h1>오늘은 어느 Day를 펼칠까요?</h1><p class="muted" style="margin:0">어제 읽던 곳도, 처음 펼치는 곳도.</p></div><nav class="tabs" aria-label="JLPT 급수">${['N2','N1'].map(l=>`<button data-level="${l}" aria-pressed="${level===l}">${l}</button>`).join('')}</nav></div><div class="section-label"><strong>${level} 단어장</strong><span>${WORDS[level].length}단어 · ${totalDays} Days · ${completed}개 Day 회독 완료</span></div><section class="books" aria-label="Day 목록">${books}</section><p class="tip">표지를 눌러 학습하세요. 카드를 뒤집은 뒤 <b>복습하기</b> 또는 <b>외움</b>으로 분류합니다.<br>50개를 모두 확인하면 1회독 완료. 복습 카드는 표지 아래에서 언제든 다시 볼 수 있습니다.</p>`;
}
function renderReader(){
 const r=record(level,day),s=session();if(!s){home();return}
 const label=`${level} · DAY ${String(day).padStart(2,'0')}`;
 let content;
 if(s.done){
  const known=Object.values(s.answers).filter(v=>v==='known').length;
  content=`<div class="completion"><div class="eyebrow">${mode==='full'?'DAY COMPLETE':'REVIEW COMPLETE'}</div><div class="big">${mode==='full'?r.rounds:'✓'}<span style="font-size:24px">${mode==='full'?'회독':''}</span></div><h2>${mode==='full'?'한 권, 잘 읽으셨습니다.':'복습을 마쳤습니다.'}</h2><p class="muted">이번 학습: 외움 ${known}개 · 복습하기 ${s.ids.length-known}개<br>남은 복습 카드 ${r.review.length}개</p><div class="actions"><button class="action" data-action="home">서재로 돌아가기</button>${r.review.length?`<button class="action primary" data-review="${day}">복습 ${r.review.length}개 다시 보기</button>`:'<button class="action primary" data-action="restart">다음 회독 시작</button>'}</div>${r.review.length?'<button class="quiet" style="margin-top:18px" data-action="restart">50개 전체로 다음 회독 시작</button>':''}<p class="muted" style="font-size:13px;margin:22px 0 0">복습만 다시 보는 것은 회독 수에 포함하지 않습니다.</p></div>`;
 }else{
  const w=currentWord();if(!w){$('#app').innerHTML='<p>단어 데이터를 불러오지 못했습니다.</p><button data-action="home">서재로 돌아가기</button>';return}
  content=`<div class="reader-head"><h1>${mode==='full'?`Day ${String(day).padStart(2,'0')}`:'복습하기'}</h1><span class="count">${s.index+1} <span style="color:#a5afa8">/ ${s.ids.length}</span></span></div><div class="progress" role="progressbar" aria-label="이번 학습 진행" aria-valuemin="0" aria-valuemax="${s.ids.length}" aria-valuenow="${Object.keys(s.answers).length}"><i style="width:${Object.keys(s.answers).length/s.ids.length*100}%"></i></div><button class="card ${flipped?'flipped':''}" data-action="flip" aria-label="${flipped?'앞면으로 돌아가기':'카드 뒤집어 정답 확인'}"><span class="side">${flipped?'READING & MEANING':'WORD'}</span>${flipped?`<span class="reading" lang="ja">${escapeHTML(w.reading)}</span><span class="meaning">${escapeHTML(w.meaning)}</span>`:`<span class="kanji" lang="ja">${escapeHTML(w.kanji)}</span>`}<span class="hint">${flipped?'한 번 더 누르면 앞면':'카드를 눌러 뜻 확인'}</span></button><div class="actions"><button class="action" data-rate="review" ${!flipped?'disabled':''}>↶ 복습하기</button><button class="action primary" data-rate="known" ${!flipped?'disabled':''}>✓ 외움</button></div><div class="smallnav"><button class="quiet" data-action="previous" ${s.index===0?'disabled':''}>← 이전 카드</button><button class="quiet shuffle-control" data-action="shuffleRemaining" aria-label="남은 카드 무작위로 섞기">↻ 카드 섞기</button><span class="quiet">${r.rounds+1}회독${mode==='review'?' · 복습 모드':''}</span></div>`;
 }
 $('#app').innerHTML=`<section class="reader"><div class="reader-top"><button class="quiet" data-action="home">← 서재</button><span class="reader-label">${label}</span><span class="muted" style="font-size:14px">${r.rounds}회독 완료</span></div>${content}</section>`;
}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.disabled)return;
 try{if(b.dataset.level)chooseLevel(b.dataset.level);else if(b.dataset.open)openDay(+b.dataset.open);else if(b.dataset.review)openDay(+b.dataset.review,'review');else if(b.dataset.rate)classify(b.dataset.rate);else{({home,flip,previous,restart,shuffleRemaining})[b.dataset.action]?.()}}catch(err){$('#notice').textContent=err.message;setTimeout(()=>{if(!storageFailed)$('#notice').textContent=''},4000)}
});
document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();home()});
document.addEventListener('keydown',e=>{if(day===null||e.target.closest('button,a,input,textarea,select,summary'))return;if(e.code==='Space'){e.preventDefault();flip()}else if(e.key==='Escape')home();else if(flipped&&e.key==='ArrowLeft')classify('review');else if(flipped&&e.key==='ArrowRight')classify('known')});
// Optional browser-agent interface; no dependency on experimental support.
if(document.modelContext?.registerTool){
 const lifecycle=new AbortController();
 const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{})}catch{}};
 register({name:'read_study_progress',description:'Read current level, current Day and saved completion and review counts.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute(){return {level,day,mode,books:['N2','N1'].flatMap(l=>Array.from({length:Math.ceil(WORDS[l].length/50)},(_,i)=>{const r=record(l,i+1);return {level:l,day:i+1,completedRounds:r.rounds,reviewCards:r.review.length}}))}}});
 register({name:'open_study_day',description:'Open a fixed Day or its saved review cards; resumes existing progress without marking a card learned.',inputSchema:{type:'object',properties:{level:{type:'string',enum:['N1','N2']},day:{type:'integer',minimum:1},mode:{type:'string',enum:['full','review']}},required:['level','day','mode'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||!['N1','N2'].includes(input.level)||!Number.isInteger(input.day)||input.day<1||input.day>Math.ceil(WORDS[input.level].length/50)||!['full','review'].includes(input.mode))throw new Error('Invalid study selection');if(input.mode==='review'&&!record(input.level,input.day).review.length)throw new Error('No review cards');chooseLevel(input.level);openDay(input.day,input.mode);return {level,day,mode,completed:session().done}}});
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
persist();render();
