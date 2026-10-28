import { LANGS } from '../../shared/types';

const en = {
  joinTitle: 'Join the line',
  yourName: 'Your first name',
  service: 'Service',
  join: 'Join the line',
  inLine: 'In line',
  wait: 'Wait',
  nowServing: 'Now serving',
  privacy: 'We’ll ping you when {n} people are left. Your name is deleted after 24 hours.',
  yourTicket: 'Your ticket',
  ahead: 'people ahead',
  aheadOne: 'person ahead',
  next: 'You’re next',
  minWait: 'min wait',
  leave: 'Leave the line',
  late: 'Running late – let one go ahead',
  upTitle: 'You’re up, {name}.',
  goTo: 'Please go to',
  hold: 'We’ll hold your spot for {n} minutes.',
  onMyWay: 'I’m on my way',
  alertsOff: 'Turn on alerts',
  alertsOn: 'Alerts on',
  alertsHint: 'Keep this page open – we’ll buzz and ping you.',
  gone: 'You’re no longer in this line.',
  joinAgain: 'Join again',
  paused: 'The line is paused right now. Please ask at the counter.',
  full: 'The line is full for now. Please try again a bit later.',
  headsUp: 'Almost your turn! Head back now.',
  called: 'It’s your turn!',
  live: 'Live',
  scanToJoin: 'Scan to join the line',
  callLine: '{name}, please come to {station}',
  waitNow: 'Wait now',
  upNext: 'Up next',
  language: 'Language'
};

type Dict = typeof en;

const es: Dict = {
  joinTitle: 'Hacer fila', yourName: 'Tu nombre', service: 'Servicio', join: 'Hacer fila', inLine: 'En fila', wait: 'Espera',
  nowServing: 'Atendiendo', privacy: 'Te avisaremos cuando queden {n} personas. Tu nombre se borra en 24 horas.', yourTicket: 'Tu turno',
  ahead: 'personas antes', aheadOne: 'persona antes', next: 'Eres el siguiente', minWait: 'min de espera', leave: 'Salir de la fila',
  late: 'Voy tarde – que pase uno antes', upTitle: '¡Es tu turno, {name}!', goTo: 'Por favor pasa a', hold: 'Guardamos tu lugar {n} minutos.',
  onMyWay: 'Ya voy', alertsOff: 'Activar avisos', alertsOn: 'Avisos activados', alertsHint: 'Deja esta página abierta: vibraremos y te avisaremos.',
  gone: 'Ya no estás en esta fila.', joinAgain: 'Volver a hacer fila', paused: 'La fila está en pausa. Pregunta en el mostrador.',
  full: 'La fila está llena por ahora. Inténtalo un poco más tarde.', headsUp: '¡Casi es tu turno! Regresa ahora.', called: '¡Es tu turno!',
  live: 'En vivo', scanToJoin: 'Escanea para hacer fila', callLine: '{name}, pase a {station}', waitNow: 'Espera actual', upNext: 'Siguientes', language: 'Idioma'
};

const zh: Dict = {
  joinTitle: '排队', yourName: '您的名字', service: '服务', join: '加入排队', inLine: '排队中', wait: '等待', nowServing: '正在服务',
  privacy: '还剩 {n} 人时我们会提醒您。您的名字将在 24 小时后删除。', yourTicket: '您的号码', ahead: '人在您前面', aheadOne: '人在您前面',
  next: '下一位就是您', minWait: '分钟等待', leave: '离开队伍', late: '我会晚到 – 让下一位先', upTitle: '{name}，轮到您了。', goTo: '请前往',
  hold: '我们为您保留 {n} 分钟。', onMyWay: '我马上到', alertsOff: '开启提醒', alertsOn: '提醒已开启', alertsHint: '请保持此页面打开，我们会震动提醒您。',
  gone: '您已不在队伍中。', joinAgain: '重新排队', paused: '排队暂停中，请到柜台询问。', full: '队伍已满，请稍后再试。', headsUp: '快到您了！请现在回来。',
  called: '轮到您了！', live: '实时', scanToJoin: '扫码排队', callLine: '{name}，请到{station}', waitNow: '当前等待', upNext: '即将叫号', language: '语言'
};

const vi: Dict = {
  joinTitle: 'Xếp hàng', yourName: 'Tên của bạn', service: 'Dịch vụ', join: 'Xếp hàng', inLine: 'Đang chờ', wait: 'Chờ', nowServing: 'Đang phục vụ',
  privacy: 'Chúng tôi sẽ báo khi còn {n} người. Tên của bạn sẽ bị xóa sau 24 giờ.', yourTicket: 'Số của bạn', ahead: 'người phía trước', aheadOne: 'người phía trước',
  next: 'Bạn là người tiếp theo', minWait: 'phút chờ', leave: 'Rời hàng', late: 'Tôi đến trễ – cho một người lên trước', upTitle: 'Đến lượt bạn, {name}.',
  goTo: 'Vui lòng đến', hold: 'Chúng tôi giữ chỗ cho bạn {n} phút.', onMyWay: 'Tôi đang đến', alertsOff: 'Bật thông báo', alertsOn: 'Đã bật thông báo',
  alertsHint: 'Hãy để trang này mở – chúng tôi sẽ rung và báo cho bạn.', gone: 'Bạn không còn trong hàng.', joinAgain: 'Xếp hàng lại',
  paused: 'Hàng đang tạm dừng. Vui lòng hỏi tại quầy.', full: 'Hàng đã đầy. Vui lòng thử lại sau.', headsUp: 'Sắp đến lượt bạn! Hãy quay lại ngay.',
  called: 'Đến lượt bạn!', live: 'Trực tiếp', scanToJoin: 'Quét để xếp hàng', callLine: '{name}, mời đến {station}', waitNow: 'Thời gian chờ', upNext: 'Tiếp theo', language: 'Ngôn ngữ'
};

const fr: Dict = {
  joinTitle: 'Rejoindre la file', yourName: 'Votre prénom', service: 'Service', join: 'Rejoindre la file', inLine: 'En file', wait: 'Attente',
  nowServing: 'En cours', privacy: 'Nous vous prévenons quand il reste {n} personnes. Votre nom est supprimé après 24 h.', yourTicket: 'Votre ticket',
  ahead: 'personnes avant vous', aheadOne: 'personne avant vous', next: 'Vous êtes le prochain', minWait: 'min d’attente', leave: 'Quitter la file',
  late: 'En retard – laisser passer quelqu’un', upTitle: 'C’est à vous, {name}.', goTo: 'Merci de vous rendre à', hold: 'Nous gardons votre place {n} minutes.',
  onMyWay: 'J’arrive', alertsOff: 'Activer les alertes', alertsOn: 'Alertes activées', alertsHint: 'Gardez cette page ouverte – on vous fera vibrer.',
  gone: 'Vous n’êtes plus dans la file.', joinAgain: 'Rejoindre à nouveau', paused: 'La file est en pause. Demandez au comptoir.',
  full: 'La file est pleine. Réessayez un peu plus tard.', headsUp: 'C’est bientôt à vous ! Revenez maintenant.', called: 'C’est à vous !',
  live: 'En direct', scanToJoin: 'Scannez pour rejoindre la file', callLine: '{name}, présentez-vous à {station}', waitNow: 'Attente actuelle', upNext: 'Prochains', language: 'Langue'
};

const pt: Dict = {
  joinTitle: 'Entrar na fila', yourName: 'Seu nome', service: 'Serviço', join: 'Entrar na fila', inLine: 'Na fila', wait: 'Espera',
  nowServing: 'Atendendo', privacy: 'Avisaremos quando faltarem {n} pessoas. Seu nome é apagado em 24 horas.', yourTicket: 'Sua senha',
  ahead: 'pessoas na frente', aheadOne: 'pessoa na frente', next: 'Você é o próximo', minWait: 'min de espera', leave: 'Sair da fila',
  late: 'Vou atrasar – deixar um passar', upTitle: 'Sua vez, {name}.', goTo: 'Por favor, vá até', hold: 'Guardamos seu lugar por {n} minutos.',
  onMyWay: 'Estou indo', alertsOff: 'Ativar avisos', alertsOn: 'Avisos ativados', alertsHint: 'Deixe esta página aberta – vamos vibrar e avisar.',
  gone: 'Você não está mais na fila.', joinAgain: 'Entrar de novo', paused: 'A fila está pausada. Pergunte no balcão.',
  full: 'A fila está cheia. Tente de novo mais tarde.', headsUp: 'Quase sua vez! Volte agora.', called: 'É a sua vez!',
  live: 'Ao vivo', scanToJoin: 'Escaneie para entrar na fila', callLine: '{name}, dirija-se a {station}', waitNow: 'Espera atual', upNext: 'Próximos', language: 'Idioma'
};

const ru: Dict = {
  joinTitle: 'Встать в очередь', yourName: 'Ваше имя', service: 'Услуга', join: 'Встать в очередь', inLine: 'В очереди', wait: 'Ожидание',
  nowServing: 'Обслуживается', privacy: 'Мы сообщим, когда останется {n} человека. Имя удаляется через 24 часа.', yourTicket: 'Ваш номер',
  ahead: 'человек перед вами', aheadOne: 'человек перед вами', next: 'Вы следующий', minWait: 'мин ожидания', leave: 'Покинуть очередь',
  late: 'Опаздываю – пропустить одного', upTitle: '{name}, ваша очередь.', goTo: 'Пожалуйста, подойдите к', hold: 'Мы держим ваше место {n} минут.',
  onMyWay: 'Уже иду', alertsOff: 'Включить уведомления', alertsOn: 'Уведомления включены', alertsHint: 'Не закрывайте страницу – мы предупредим вибрацией.',
  gone: 'Вас больше нет в очереди.', joinAgain: 'Встать снова', paused: 'Очередь приостановлена. Спросите у стойки.',
  full: 'Очередь заполнена. Попробуйте чуть позже.', headsUp: 'Скоро ваша очередь! Возвращайтесь.', called: 'Ваша очередь!',
  live: 'В эфире', scanToJoin: 'Сканируйте, чтобы встать в очередь', callLine: '{name}, подойдите к {station}', waitNow: 'Ожидание сейчас', upNext: 'Далее', language: 'Язык'
};

const uk: Dict = {
  joinTitle: 'Стати в чергу', yourName: 'Ваше ім’я', service: 'Послуга', join: 'Стати в чергу', inLine: 'У черзі', wait: 'Очікування',
  nowServing: 'Обслуговується', privacy: 'Ми повідомимо, коли залишиться {n} людини. Ім’я видаляється через 24 години.', yourTicket: 'Ваш номер',
  ahead: 'людей перед вами', aheadOne: 'людина перед вами', next: 'Ви наступний', minWait: 'хв очікування', leave: 'Вийти з черги',
  late: 'Запізнююсь – пропустити одного', upTitle: '{name}, ваша черга.', goTo: 'Будь ласка, підійдіть до', hold: 'Ми тримаємо ваше місце {n} хвилин.',
  onMyWay: 'Вже йду', alertsOff: 'Увімкнути сповіщення', alertsOn: 'Сповіщення увімкнено', alertsHint: 'Не закривайте сторінку – ми попередимо вібрацією.',
  gone: 'Вас більше немає в черзі.', joinAgain: 'Стати знову', paused: 'Чергу призупинено. Запитайте на стійці.',
  full: 'Черга заповнена. Спробуйте трохи пізніше.', headsUp: 'Скоро ваша черга! Повертайтеся.', called: 'Ваша черга!',
  live: 'Наживо', scanToJoin: 'Скануйте, щоб стати в чергу', callLine: '{name}, підійдіть до {station}', waitNow: 'Очікування зараз', upNext: 'Далі', language: 'Мова'
};

const pl: Dict = {
  joinTitle: 'Stań w kolejce', yourName: 'Twoje imię', service: 'Usługa', join: 'Stań w kolejce', inLine: 'W kolejce', wait: 'Czekanie',
  nowServing: 'Obsługiwany', privacy: 'Damy znać, gdy zostaną {n} osoby. Imię usuwamy po 24 godzinach.', yourTicket: 'Twój numer',
  ahead: 'osób przed tobą', aheadOne: 'osoba przed tobą', next: 'Jesteś następny', minWait: 'min czekania', leave: 'Opuść kolejkę',
  late: 'Spóźnię się – przepuść jedną osobę', upTitle: '{name}, twoja kolej.', goTo: 'Zapraszamy do', hold: 'Trzymamy twoje miejsce {n} minut.',
  onMyWay: 'Już idę', alertsOff: 'Włącz powiadomienia', alertsOn: 'Powiadomienia włączone', alertsHint: 'Nie zamykaj strony – powiadomimy cię wibracją.',
  gone: 'Nie jesteś już w kolejce.', joinAgain: 'Stań ponownie', paused: 'Kolejka jest wstrzymana. Zapytaj przy ladzie.',
  full: 'Kolejka jest pełna. Spróbuj trochę później.', headsUp: 'Zaraz twoja kolej! Wracaj teraz.', called: 'Twoja kolej!',
  live: 'Na żywo', scanToJoin: 'Zeskanuj, aby stanąć w kolejce', callLine: '{name}, zapraszamy do {station}', waitNow: 'Czas oczekiwania', upNext: 'Następni', language: 'Język'
};

const lt: Dict = {
  joinTitle: 'Stoti į eilę', yourName: 'Jūsų vardas', service: 'Paslauga', join: 'Stoti į eilę', inLine: 'Eilėje', wait: 'Laukimas',
  nowServing: 'Aptarnaujamas', privacy: 'Pranešime, kai liks {n} žmonės. Jūsų vardas ištrinamas po 24 val.', yourTicket: 'Jūsų numeris',
  ahead: 'žmonės prieš jus', aheadOne: 'žmogus prieš jus', next: 'Jūs kitas', minWait: 'min. laukti', leave: 'Išeiti iš eilės',
  late: 'Vėluoju – praleisti vieną', upTitle: '{name}, jūsų eilė.', goTo: 'Prašom prie', hold: 'Jūsų vietą laikome {n} min.',
  onMyWay: 'Jau einu', alertsOff: 'Įjungti pranešimus', alertsOn: 'Pranešimai įjungti', alertsHint: 'Laikykite šį puslapį atidarytą – pranešime vibracija.',
  gone: 'Jūs nebe eilėje.', joinAgain: 'Stoti iš naujo', paused: 'Eilė sustabdyta. Klauskite prie kasos.',
  full: 'Eilė pilna. Pabandykite kiek vėliau.', headsUp: 'Netrukus jūsų eilė! Grįžkite.', called: 'Jūsų eilė!',
  live: 'Gyvai', scanToJoin: 'Nuskenuokite ir stokite į eilę', callLine: '{name}, prašom prie {station}', waitNow: 'Laukimas dabar', upNext: 'Toliau', language: 'Kalba'
};

const ko: Dict = {
  joinTitle: '줄 서기', yourName: '이름', service: '서비스', join: '줄 서기', inLine: '대기 인원', wait: '대기',
  nowServing: '진행 중', privacy: '{n}명 남으면 알려드립니다. 이름은 24시간 후 삭제됩니다.', yourTicket: '내 번호',
  ahead: '명 앞에 있음', aheadOne: '명 앞에 있음', next: '다음 차례입니다', minWait: '분 대기', leave: '줄에서 나가기',
  late: '늦어요 – 한 명 먼저', upTitle: '{name}님, 차례입니다.', goTo: '이곳으로 와주세요', hold: '{n}분 동안 자리를 맡아둡니다.',
  onMyWay: '가는 중이에요', alertsOff: '알림 켜기', alertsOn: '알림 켜짐', alertsHint: '이 페이지를 열어두세요. 진동으로 알려드립니다.',
  gone: '줄에 없습니다.', joinAgain: '다시 줄 서기', paused: '대기가 일시 중지되었습니다. 카운터에 문의하세요.',
  full: '대기 인원이 가득 찼습니다. 잠시 후 다시 시도하세요.', headsUp: '곧 차례입니다! 지금 돌아오세요.', called: '차례입니다!',
  live: '실시간', scanToJoin: '스캔하여 줄 서기', callLine: '{name}님, {station}로 와주세요', waitNow: '현재 대기', upNext: '다음 순서', language: '언어'
};

const ar: Dict = {
  joinTitle: 'انضم إلى الطابور', yourName: 'اسمك', service: 'الخدمة', join: 'انضم إلى الطابور', inLine: 'في الطابور', wait: 'الانتظار',
  nowServing: 'يُخدم الآن', privacy: 'سننبهك عندما يتبقى {n} أشخاص. يُحذف اسمك بعد 24 ساعة.', yourTicket: 'رقمك',
  ahead: 'أشخاص قبلك', aheadOne: 'شخص قبلك', next: 'أنت التالي', minWait: 'دقيقة انتظار', leave: 'مغادرة الطابور',
  late: 'سأتأخر – دع شخصًا يتقدم', upTitle: 'حان دورك يا {name}.', goTo: 'يرجى التوجه إلى', hold: 'سنحجز مكانك لمدة {n} دقائق.',
  onMyWay: 'أنا قادم', alertsOff: 'تفعيل التنبيهات', alertsOn: 'التنبيهات مفعلة', alertsHint: 'أبقِ هذه الصفحة مفتوحة – سننبهك بالاهتزاز.',
  gone: 'لم تعد في هذا الطابور.', joinAgain: 'انضم مجددًا', paused: 'الطابور متوقف حاليًا. اسأل عند المكتب.',
  full: 'الطابور ممتلئ الآن. حاول لاحقًا.', headsUp: 'اقترب دورك! عد الآن.', called: 'حان دورك!',
  live: 'مباشر', scanToJoin: 'امسح للانضمام إلى الطابور', callLine: '{name}، تفضل إلى {station}', waitNow: 'الانتظار الآن', upNext: 'التالي', language: 'اللغة'
};

const DICTS: Record<string, Dict> = { en, es, zh, vi, fr, pt, ru, uk, pl, lt, ko, ar };

export type TKey = keyof Dict;

export function t(lang: string, key: TKey, vars: Record<string, string | number> = {}): string {
  const d = DICTS[lang] ?? en;
  let s = d[key] ?? en[key];
  for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

export function pickLang(available: string[]): string {
  const prefs = (navigator.languages ?? [navigator.language]).map((l) => l.slice(0, 2).toLowerCase());
  return prefs.find((p) => available.includes(p)) ?? available[0] ?? 'en';
}

export const langLabel = (code: string) => LANGS.find((l) => l.code === code)?.label ?? code.toUpperCase();
export const speechLang = (code: string) => LANGS.find((l) => l.code === code)?.speech ?? 'en-US';
