/**
 * Small, hand-picked dictionary covering navigation, page headers, and the
 * highest-confusion buttons/instructions, not a full translation of every
 * string in the app. Bisaya (Cebuano) text is plain, everyday phrasing
 * aimed at non-technical, older readers, not formal/textbook Cebuano.
 *
 * `simple: true` marks phrases basic enough in English that "hybrid" mode
 * shouldn't bother appending the Bisaya version (e.g. "Good morning") -
 * hybrid is meant for the longer, jargon-y stuff that's actually hard to
 * parse in a second language, not every single word.
 */

export type LangKey = keyof typeof DICTIONARY;

export const DICTIONARY = {
  "nav.home": { en: "Dashboard", bisaya: "Panid" },
  "nav.map": { en: "Park Map", bisaya: "Mapa sa Parke" },
  "nav.clients": { en: "Clients", bisaya: "mga Kliyente" },
  "nav.overdue": { en: "Overdue", bisaya: "Naulahi og Bayad" },
  "nav.collections": { en: "Collections", bisaya: "mga Bayad" },
  "nav.ledger": { en: "Lots & Ledger", bisaya: "mga Lote" },
  "nav.expenses": { en: "Expenses", bisaya: "Gasto" },
  "nav.audit": { en: "Audit", bisaya: "Talaan sa Buhat" },
  "nav.pending": { en: "Approvals", bisaya: "Pag-uyon" },
  "nav.settings": { en: "Settings", bisaya: "Kasayoran sa Panid" },
  "nav.faq": { en: "Help / FAQ", bisaya: "Tabang / Mga Pangutana" },

  "newClient.button": { en: "New Client", bisaya: "Bag-ong Kliyente" },
  "newClient.title": { en: "New client", bisaya: "Bag-ong Kliyente" },
  "newClient.desc": {
    en: "Add someone taking a lot, every field here is required so the record is usable from day one.",
    bisaya: "Idugang ang tawo nga mokuha og lote. Kinahanglan mapuno tanang kahon aron kompleto ang rekord.",
  },

  "greeting.morning": { en: "Good morning", bisaya: "Maayong Buntag", simple: true },
  "greeting.afternoon": { en: "Good afternoon", bisaya: "Maayong Hapon", simple: true },
  "greeting.evening": { en: "Good evening", bisaya: "Maayong Gabii", simple: true },

  "page.map.title": { en: "Park Map", bisaya: "Mapa sa Parke" },
  "page.map.desc": {
    en: "The site plan, painted by status or by tier. Click a lot for details.",
    bisaya: "Ang mapa sa lugar. Pindota ang usa ka lote aron makita ang detalye niini.",
  },

  "page.clients.title": { en: "Clients", bisaya: "mga Kliyente" },
  "page.clients.desc": {
    en: "Everyone who owns or is reserving a lot at Heaven's Gate.",
    bisaya: "Tanan nga tag-iya o nag-reserve og lote sa Heaven's Gate.",
  },

  "page.lots.title": { en: "Lots & Ledger", bisaya: "mga Lote" },
  "page.lots.desc": {
    en: "Every inventory unit, its current status, and who holds it.",
    bisaya: "Tanan nga lote, ang kahimtang niini karon, ug kinsay nag-book.",
  },

  "page.expenses.title": { en: "Expenses", bisaya: "Gasto" },
  "page.expenses.desc": {
    en: "Company expenses, including petty cash spent on-hand.",
    bisaya: "Mga gasto sa kompanya, lakip na ang gamay nga kwarta nga gigasto.",
  },

  "page.audit.title": { en: "Audit log", bisaya: "Talaan sa Buhat" },
  "page.audit.desc": {
    en: "Every write made through the app: who did what, and when. Newest first.",
    bisaya: "Listahan sa tanang gibuhat dinhi sa app: kinsa, unsa, ug kanus-a. Pinakabag-o una.",
  },

  "page.collections.title": { en: "Collections", bisaya: "mga Bayad" },
  "page.collections.desc": {
    en: "Recent payments across every lot, most recent first.",
    bisaya: "Mga bag-o nga bayad sa tanang lote, pinakabag-o una.",
  },

  "page.overdue.title": { en: "Overdue accounts", bisaya: "Naulahi og Bayad" },
  "page.overdue.desc": {
    en: "Every delinquent or defaulted contract, worst first, for follow-up calls, emails, and SMS.",
    bisaya: "Mga kontrata nga naulahi o na-default na, pinakagrabe una, para sundan sa tawag, email, o text.",
  },

  "page.pending.title": { en: "Approvals", bisaya: "Pag-uyon" },
  "page.pending.desc.admin": {
    en: "Payments and edits submitted by staff, waiting on your review.",
    bisaya: "Mga bayad ug kausaban nga gisumite sa staff, naghulat sa imong pag-check.",
  },
  "page.pending.desc.staff": {
    en: "Submissions you've made, and whether they've been reviewed.",
    bisaya: "Ang imong gisumite, ug kung na-check na ba kini.",
  },

  "overdue.hint.reminder": {
    en: "Send reminder emails the client to let them know their payment is late.",
    bisaya: "Ang Send reminder mag-email sa kliyente nga naulahi na ang iyang bayad.",
  },
  "overdue.hint.defaulted": {
    en: "Mark as Defaulted flags the account as defaulted right now, before it happens on its own. You'll be asked to type a short reason first, this is for accounts that have clearly stopped paying.",
    bisaya: "Ang Mark as Defaulted mag-tag sa account nga \"defaulted\" dayon. Hangyoon ka og mubo nga rason una. Gamiton ni kung klaro nga mihunong na og bayad ang kliyente.",
  },

  "button.markDefaulted": { en: "Mark as Defaulted", bisaya: "I-mark nga Defaulted" },
  "button.sendReminder": { en: "Send reminder", bisaya: "Padad-i og Pahinumdom" },
  "button.createClient": { en: "Create client", bisaya: "Himoa ang Kliyente" },
  "button.tapToView": { en: "Tap to view", bisaya: "Pindota aron tan-awon", simple: true },

  "quickActions.title": { en: "What do you need to do?", bisaya: "Unsay imong buhaton?" },
  "quickActions.subtitle": {
    en: "The most common tasks, one tap away.",
    bisaya: "Ang kasagarang buluhaton, usa ra ka pindot.",
  },
  "quickActions.addClient.label": { en: "Add a new client", bisaya: "Pagdugang og bag-ong kliyente" },
  "quickActions.addClient.desc": { en: "Someone new is taking a lot", bisaya: "Naay bag-ong mokuha og lote" },
  "quickActions.logPayment.label": { en: "Log a payment I received", bisaya: "I-record ang bayad nga nadawat" },
  "quickActions.logPayment.desc": { en: "A client just paid you", bisaya: "Bag-o lang nibayad ang kliyente" },
  "quickActions.markDefaulted.label": { en: "Mark someone as defaulted", bisaya: "I-mark ang kliyente nga defaulted" },
  "quickActions.markDefaulted.desc": {
    en: "A client has clearly stopped paying",
    bisaya: "Klaro nga mihunong na og bayad ang kliyente",
  },
  "quickActions.sendReminder.label": { en: "Send a payment reminder", bisaya: "Pagpadala og pahinumdom sa bayad" },
  "quickActions.sendReminder.desc": { en: "Email a client that they're late", bisaya: "I-email ang kliyente nga naulahi na" },
  "quickActions.findSomeone.label": { en: "Find a client or lot", bisaya: "Pangitaa ang kliyente o lote" },
  "quickActions.findSomeone.desc": { en: "Search by name, lot, or OR number", bisaya: "Pangitaa pinaagi sa ngalan, lote, o OR number" },
  "quickActions.viewAllLots.label": { en: "View all lots", bisaya: "Tan-awa ang tanang lote" },
  "quickActions.viewAllLots.desc": { en: "See what's available, sold, or reserved", bisaya: "Tan-awa kung unsay bakante, nabaligya, o reserved" },

  "language.toggle.label": { en: "Language", bisaya: "Pinulongan" },

  "stat.collectedThisMonth": { en: "Collected this month", bisaya: "Nakolekta this month" },
  "stat.activeClients": { en: "Active clients", bisaya: "Aktibo nga Kliyente" },
  "stat.delinquentAccounts": { en: "Delinquent accounts", bisaya: "Naulahi og Bayad" },
  "stat.occupiedLots": { en: "Occupied lots", bisaya: "Nakuha nga Lote" },
  "dashboard.topOverdue": { en: "Top overdue accounts", bisaya: "Labing Naulahi og Bayad" },
  "dashboard.recentActivity": { en: "Recent activity", bisaya: "Bag-ong Kalihokan" },

  "page.settings.title": { en: "Settings", bisaya: "Kasayoran sa Panid" },
  "page.settings.desc": {
    en: "Change how the app looks on this device. These only affect your own browser.",
    bisaya: "Usba kung unsa ang panagway sa app niini nga device. Kini apektado ra sa imong kaugalingong browser.",
  },
  "settings.appearance.title": { en: "Background colors", bisaya: "Kolor sa Background" },
  "settings.appearance.desc": {
    en: "The soft color wash behind the app, from the bottom color to the top color.",
    bisaya: "Ang humok nga kolor sa likod sa app, gikan sa kolor sa ubos paingon sa kolor sa taas.",
  },
  "settings.bottomColor": { en: "Bottom color", bisaya: "Kolor sa Ubos" },
  "settings.topColor": { en: "Top color", bisaya: "Kolor sa Taas" },
  "settings.depth": { en: "How much color", bisaya: "Kadaghan sa Kolor" },
  "settings.depth.desc": {
    en: "Slide right for more color at the top, left for more plain white.",
    bisaya: "I-slide sa tuo para mas daghang kolor sa taas, sa wala para mas puti.",
  },
  "settings.reset": { en: "Reset to default", bisaya: "Ibalik sa Default" },
  "settings.preview": { en: "Preview", bisaya: "Preview" },

  "page.faq.title": { en: "Help / FAQ", bisaya: "Tabang / Mga Pangutana" },
  "page.faq.desc": {
    en: "Plain-language answers to the most common questions, for staff and for anyone new to computers.",
    bisaya: "Sayon nga mga tubag sa kasagarang pangutana, para sa staff ug sa bag-o pa sa kompyuter.",
  },

  "faq.addClient.q": { en: "How do I add a new client?", bisaya: "Unsaon pagdugang og bag-ong kliyente?" },
  "faq.addClient.a": {
    en: "Press the black \"+ New Client\" button at the top of the left menu, or use the \"Add a new client\" card on the Dashboard. Fill in their name, contact info, and the lot they're taking, then press Create client.",
    bisaya: "Pindota ang itom nga \"+ New Client\" sa taas sa wala nga menu, o ang \"Add a new client\" nga kard sa Dashboard. I-type ang ilang ngalan, contact, ug lote, dayon pindota ang Create client.",
  },

  "faq.markDefaulted.q": { en: "How do I mark someone as defaulted?", bisaya: "Unsaon pag-mark sa kliyente nga defaulted?" },
  "faq.markDefaulted.a": {
    en: "Go to the Overdue tab (under Clients in the menu). Find their name, then press the red \"Mark as Defaulted\" button. You'll be asked to type a short reason first, this is required and cannot be skipped.",
    bisaya: "Adto sa Overdue tab (ilalom sa Clients sa menu). Pangitaa ang ngalan, dayon pindota ang pula nga \"Mark as Defaulted\". Hangyoon ka og mubo nga rason, kinahanglan gyud ni.",
  },

  "faq.logPayment.q": { en: "How do I log a payment I received?", bisaya: "Unsaon pag-record sa bayad nga nadawat?" },
  "faq.logPayment.a": {
    en: "Go to Collections (under Clients), press \"Log payment,\" and fill in who paid, how much, and how (cash, bank transfer, GCash, etc). It shows up on the client's record right away.",
    bisaya: "Adto sa Collections (ilalom sa Clients), pindota ang \"Log payment,\" ug isulat kinsa nibayad, tag-pila, ug unsaon (cash, bank transfer, GCash, ug uban pa). Dayon makita dayon sa record sa kliyente.",
  },

  "faq.difference.q": {
    en: "What's the difference between \"Delinquent\" and \"Defaulted\"?",
    bisaya: "Unsa ang kalahian sa \"Delinquent\" ug \"Defaulted\"?",
  },
  "faq.difference.a": {
    en: "Delinquent means a payment is late, but the account is still considered active. Defaulted is more serious, it means the account has been flagged as having clearly stopped paying, either automatically after a long time overdue, or by staff using \"Mark as Defaulted.\"",
    bisaya: "Ang Delinquent nagpasabot nga naulahi ang bayad, pero aktibo pa gihapon ang account. Ang Defaulted mas seryoso, nagpasabot nga klaro nga mihunong na og bayad, either automatic human sa taas nga panahon, o gi-mark sa staff.",
  },

  "faq.language.q": { en: "How do I change the language?", bisaya: "Unsaon pag-usab sa pinulongan?" },
  "faq.language.a": {
    en: "At the top of the screen, press EN for English, BIS for Bisaya, or EN+BIS to see both together. This is saved on this device, everyone else can pick their own.",
    bisaya: "Sa taas sa screen, pindota ang EN para English, BIS para Bisaya, o EN+BIS para makita ang duha. Kini masave lang sa niini nga device.",
  },

  "faq.collapse.q": { en: "How do I make the left menu smaller?", bisaya: "Unsaon paggamay sa wala nga menu?" },
  "faq.collapse.a": {
    en: "Press the square button in the bottom-left corner of the screen. Press it again to bring the menu back to full size.",
    bisaya: "Pindota ang kwadrado nga button sa ubos-wala nga eskina sa screen. Pindota pag-usab para ibalik sa dako.",
  },

  "faq.viewLots.q": { en: "Where do I see all the lots?", bisaya: "Asa nako makita ang tanang lote?" },
  "faq.viewLots.a": {
    en: "Press \"Lots & Ledger\" in the left menu. You can also see them laid out on a map under \"Park Map.\"",
    bisaya: "Pindota ang \"Lots & Ledger\" sa wala nga menu. Makita usab nimo sila sa mapa ilalom sa \"Park Map.\"",
  },

  "faq.mistake.q": { en: "I think I made a mistake, what do I do?", bisaya: "Nagduha-duha ko nga sayop akong gibuhat, unsay buhaton?" },
  "faq.mistake.a": {
    en: "Don't worry, every action is recorded. Go to the Audit tab in the left menu to see exactly what was done and when, then tell an admin so they can help fix it. Nothing is deleted permanently by accident.",
    bisaya: "Ayaw kabalaka, na-record ang tanang gibuhat. Adto sa Audit tab sa wala nga menu para makita ang eksaktong nahitabo, dayon sultihi ang admin para matabangan ka. Wala na-delete permanente kung aksidente.",
  },

  "faq.appearance.q": { en: "Can I change the colors of the app?", bisaya: "Pwede ba nako usbon ang kolor sa app?" },
  "faq.appearance.a": {
    en: "Yes, go to Settings in the left menu. You can change the background colors and how much color shows, on this device only.",
    bisaya: "Oo, adto sa Settings sa wala nga menu. Pwede nimo usbon ang kolor sa background ug kadaghan sa kolor, niini ra nga device.",
  },
} satisfies Record<string, { en: string; bisaya: string; simple?: boolean }>;
