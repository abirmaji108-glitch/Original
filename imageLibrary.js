// imageLibrary.js - Complete image library with 50 topics and keyword detection
const IMAGE_LIBRARY = {
  // ==================== 20 FIXED TOPICS ====================
 
  restaurant: {
    keywords: ['restaurant', 'food', 'dining', 'cafe', 'bistro', 'eatery', 'kitchen', 'meal', 'culinary', 'chef', 'menu', 'dinner', 'lunch'],
    images: [
      'photo-1517248135467-4c7edcad34c4',
      'photo-1565299624946-b28f40a0ae38',
      'photo-1551782450-a2132b4ba21d',
      'photo-1414235077428-338989a2e8c0',
      'photo-1600565193348-f74bd3c7ccdf',
      'photo-1517248135467-4c7edcad34c4'
    ]
  },
  gym: {
    keywords: ['gym', 'fitness', 'workout', 'exercise', 'training', 'health', 'bodybuilding', 'crossfit', 'athlete', 'sports', 'muscle', 'cardio', 'yoga'],
    images: [
      'photo-1534438327276-14e5300c3a48',
      'photo-1571019613454-1cb2f99b2d8b',
      'photo-1534367507877-0edd93bd013b',
      'photo-1544367567-0f2fcb009e0b',
      'photo-1583454110551-21f2fa2afe61',
      'photo-1534438327276-14e5300c3a48'
    ]
  },
  wedding: {
    keywords: ['wedding', 'event', 'couple', 'ceremony', 'celebration', 'bride', 'groom', 'marriage', 'reception', 'romantic', 'matrimony', 'nuptial', 'engagement'],
    images: [
      'photo-1511285560929-80b456fea0bc',
      'photo-1511988617509-a57c8a288659',
      'photo-1465495976277-4387d4b0e4a6',
      'photo-1511795409834-ef04bbd61622',
      'photo-1519741497674-611481863552',
      'photo-1511285560929-80b456fea0bc'
    ]
  },
  realestate: {
    keywords: ['real estate', 'property', 'house', 'home', 'apartment', 'condo', 'housing', 'realty', 'residence', 'estate', 'villa', 'luxury home'],
    images: [
      'photo-1560518883-ce09059eeffa',
      'photo-1570129477492-45c003edd2be',
      'photo-1568605114967-8130f3a36994',
      'photo-1512917774080-9991f1c4c750',
      'photo-1582407947304-fd86f028f716',
      'photo-1560518883-ce09059eeffa'
    ]
  },
  ecommerce: {
    keywords: ['ecommerce', 'shop', 'store', 'shopping', 'retail', 'online store', 'marketplace', 'products', 'fashion', 'boutique', 'purchase'],
    images: [
      'photo-1441986300917-64674bd600d8',
      'photo-1483985988355-763728e1935b',
      'photo-1445205170230-053b83016050',
      'photo-1472851294608-062f824d29cc',
      'photo-1526178613552-2b45c6c302f0',
      'photo-1441986300917-64674bd600d8'
    ]
  },
  portfolio: {
    keywords: ['portfolio', 'design', 'creative', 'artist', 'work', 'showcase', 'professional', 'studio', 'project', 'graphic design', 'art'],
    images: [
      'photo-1499951360447-b19be8fe80f5',
      'photo-1517048676732-d65bc937f952',
      'photo-1542744094-3a31f272c490',
      'photo-1487017159836-4e23ece2e4cf',
      'photo-1531403009284-440f080d1e12',
      'photo-1499951360447-b19be8fe80f5'
    ]
  },
  coffee: {
    keywords: ['coffee', 'cafe', 'coffeeshop', 'barista', 'espresso', 'cappuccino', 'latte', 'caffeine', 'beans', 'roast', 'brew'],
    images: [
      'photo-1511920170033-f8396924c348',
      'photo-1501339847302-ac426a4a7cbb',
      'photo-1442512595331-e89e73853f31',
      'photo-1495474472287-4d71bcdd2085',
      'photo-1453614512568-c4024d13c247',
      'photo-1511920170033-f8396924c348'
    ]
  },
  hotel: {
    keywords: ['hotel', 'resort', 'accommodation', 'hospitality', 'luxury', 'lodging', 'suite', 'vacation', 'travel', 'booking', 'inn'],
    images: [
      'photo-1566073771259-6a8506099945',
      'photo-1571896349842-33c89424de2d',
      'photo-1618773928121-c32242e63f39',
      'photo-1520250497591-112f2f40a3f4',
      'photo-1582719478250-c89cae4dc85b',
      'photo-1566073771259-6a8506099945'
    ]
  },
  medical: {
    keywords: ['medical', 'healthcare', 'hospital', 'clinic', 'doctor', 'health', 'medicine', 'physician', 'care', 'wellness', 'treatment'],
    images: [
      'photo-1519494026892-80bbd2d6fd0d',
      'photo-1530026405186-ed1f139313f8',
      'photo-1551190822-a9333d879b1f',
      'photo-1576091160399-112ba8d25d1d',
      'photo-1504813184591-01572f98c85f',
      'photo-1519494026892-80bbd2d6fd0d'
    ]
  },
  law: {
    keywords: ['law', 'legal', 'lawyer', 'attorney', 'justice', 'court', 'advocate', 'counsel', 'litigation', 'firm', 'paralegal'],
    images: [
      'photo-1589829545856-d10d557cf95f',
      'photo-1505664194779-8beaceb93744',
      'photo-1521587760476-6c12a4b040da',
      'photo-1554224311-beee460c201f',
      'photo-1479142506502-19b3a3b7ff33',
      'photo-1589829545856-d10d557cf95f'
    ]
  },
  photography: {
    keywords: ['photography', 'photographer', 'photo', 'camera', 'studio', 'portrait', 'photoshoot', 'lens', 'images', 'professional photography'],
    images: [
      'photo-1542038784456-1ea8e935640e',
      'photo-1452587925148-ce544e77e70d',
      'photo-1554048612-b6a482bc67e5',
      'photo-1471341971476-ae15ff5dd4ea',
      'photo-1606857521015-7f9fcf423740',
      'photo-1542038784456-1ea8e935640e'
    ]
  },
  construction: {
    keywords: ['construction', 'builder', 'contractor', 'building', 'architecture', 'renovation', 'engineering', 'development', 'infrastructure', 'general contractor'],
    images: [
      'photo-1503387762-592deb58ef4e',
      'photo-1504307651254-35680f356dfd',
      'photo-1541888946425-d81bb19240f5',
      'photo-1590496793907-3802b8e10fef',
      'photo-1581094794329-c8112a89af12',
      'photo-1503387762-592deb58ef4e'
    ]
  },
  automotive: {
    keywords: ['automotive', 'car', 'vehicle', 'auto', 'dealership', 'automobile', 'garage', 'mechanic', 'repair', 'showroom', 'motors'],
    images: [
      'photo-1492144534655-ae79c964c9d7',
      'photo-1580273916550-e323be2ae537',
      'photo-1552519507-da3b142c6e3d',
      'photo-1503376780353-7e6692767b70',
      'photo-1605559424843-9e4c228bf1c2',
      'photo-1492144534655-ae79c964c9d7'
    ]
  },
  saas: {
    keywords: ['saas', 'software', 'technology', 'app', 'digital', 'tech', 'platform', 'cloud', 'solution', 'startup', 'innovation'],
    images: [
      'photo-1460925895917-afdab827c52f',
      'photo-1551288049-bebda4e38f71',
      'photo-1519389950473-47ba0277781c',
      'photo-1531482615713-2afd69097998',
      'photo-1522071820081-009f0129c71c',
      'photo-1460925895917-afdab827c52f'
    ]
  },
  education: {
    keywords: ['education', 'course', 'learning', 'school', 'university', 'training', 'academy', 'college', 'student', 'teaching', 'elearning'],
    images: [
      'photo-1523240795612-9a054b0db644',
      'photo-1524178232363-1fb2b075b655',
      'photo-1509062522246-3755977927d7',
      'photo-1546410531-bb4caa6b424d',
      'photo-1503676260728-1c00da094a0b',
      'photo-1523240795612-9a054b0db644'
    ]
  },
  blog: {
    keywords: ['blog', 'magazine', 'content', 'writing', 'publisher', 'article', 'news', 'editorial', 'journal', 'publication', 'writer'],
    images: [
      'photo-1499750310107-5fef28a66643',
      'photo-1456324504439-367cee3b3c32',
      'photo-1503149779833-1de50ebe5f8a',
      'photo-1488190211105-8b0e65b80b4e',
      'photo-1434030216411-0b793f4b4173',
      'photo-1499750310107-5fef28a66643'
    ]
  },
  nonprofit: {
    keywords: ['nonprofit', 'charity', 'donation', 'volunteer', 'community', 'ngo', 'foundation', 'fundraising', 'cause', 'humanitarian'],
    images: [
      'photo-1488521787991-ed7bbaae773c',
      'photo-1469571486292-0ba58a3f068b',
      'photo-1532629345422-7515f3d16bb6',
      'photo-1593113598332-cd288d649433',
      'photo-1559027615-cd4628902d4a',
      'photo-1488521787991-ed7bbaae773c'
    ]
  },
  music: {
    keywords: ['music', 'band', 'musician', 'concert', 'artist', 'performance', 'audio', 'sound', 'entertainment', 'stage', 'recording'],
    images: [
      'photo-1511379938547-c1f69419868d',
      'photo-1510915361894-db8b60106cb1',
      'photo-1514320291840-2e0a9bf2a9ae',
      'photo-1493225457124-a3eb161ffa5f',
      'photo-1507003211169-0a1dd7228f2d',
      'photo-1511379938547-c1f69419868d'
    ]
  },
  product: {
    keywords: ['product', 'landing', 'launch', 'startup', 'innovation', 'showcase', 'app landing', 'feature', 'demo', 'presentation'],
    images: [
      'photo-1551650975-87deedd944c3',
      'photo-1526947425960-945c6e72858f',
      'photo-1523726491678-bf852e717f6a',
      'photo-1496171367470-9ed9a91ea931',
      'photo-1531973576160-7125cd663d86',
      'photo-1551650975-87deedd944c3'
    ]
  },
  business: {
    keywords: ['business', 'agency', 'consulting', 'professional', 'corporate', 'company', 'enterprise', 'services', 'firm', 'office'],
    images: [
      'photo-1497366216548-37526070297c',
      'photo-1542744173-8e7e53415bb0',
      'photo-1556761175-4b46a572b786',
      'photo-1521737852567-6949f3f9f2b5',
      'photo-1553877522-43269d4ea984',
      'photo-1497366216548-37526070297c'
    ]
  },
  // ==================== 30 UNCOMMON TOPICS ====================
  wine: {
    keywords: ['wine', 'liquor', 'spirits', 'alcohol', 'whiskey', 'vodka', 'rum', 'gin', 'brewery', 'winery', 'distillery', 'bar', 'pub', 'craft', 'premium'],
    images: [
      'photo-1510812431401-41d2bd2722f3',
      'photo-1569529465841-dfecdab7503b',
      'photo-1574169208507-84376144848b',
      'photo-1586313651513-60c7f4082560',
      'photo-1572490122747-3968b75cc699',
      'photo-1510812431401-41d2bd2722f3'
    ]
  },
  beer: {
    keywords: ['beer', 'brewery', 'craft beer', 'ale', 'lager', 'pub', 'taproom', 'brewing', 'hops', 'malt'],
    images: [
      'photo-1436076863939-a3e6039e69c7',
      'photo-1516534775068-ba3e7458af70',
      'photo-1559827260-dc66a990b1f4',
      'photo-1518176258769-f227c798150e',
      'photo-1608270586620-248524c67de9',
      'photo-1436076863939-a3e6039e69c7'
    ]
  },
  grocery: {
    keywords: ['grocery', 'supermarket', 'market', 'fresh', 'organic', 'produce', 'food market'],
    images: [
      'photo-1588964895597-cfccd6e2dbf9',
      'photo-1542838132-92c53300491e',
      'photo-1534723328310-e82dad3ee43f',
      'photo-1601599561213-832382fd07ba',
      'photo-1583258292688-d0213dc5a3a8',
      'photo-1588964895597-cfccd6e2dbf9'
    ]
  },
  pharmacy: {
    keywords: ['pharmacy', 'drugstore', 'medication', 'prescription', 'pharmacist', 'medicine'],
    images: [
      'photo-1576602976047-174e57a47881',
      'photo-1587854692152-cbe660dbde88',
      'photo-1585435421671-0cc5423e2815',
      'photo-1471864190281-a93a3070b6de',
      'photo-1550831107-1553da8c8464',
      'photo-1576602976047-174e57a47881'
    ]
  },
  petstore: {
    keywords: ['pet store', 'pet', 'animal', 'pet supplies', 'dog', 'cat', 'grooming'],
    images: [
      'photo-1450778869180-41d0601e046e',
      'photo-1560807707-8cc77767d783',
      'photo-1600077106725-e3a3f45e6101',
      'photo-1581888227599-779811939961',
      'photo-1548199973-03cce0bbc87b',
      'photo-1450778869180-41d0601e046e'
    ]
  },
  salon: {
    keywords: ['salon', 'spa', 'beauty', 'hair', 'hairstyle', 'barber', 'wellness', 'massage'],
    images: [
      'photo-1560066984-138dacc3d028',
      'photo-1562322140-8baeececf3df',
      'photo-1519415510236-718bdfcd89c8',
      'photo-1521590832167-7bcbfaa6381f',
      'photo-1487412947147-5cebf100ffc2',
      'photo-1560066984-138dacc3d028'
    ]
  },
  tattoo: {
    keywords: ['tattoo', 'ink', 'body art', 'piercing', 'tattoo artist', 'studio'],
    images: [
      'photo-1568515387631-8b650bbcdb90',
      'photo-1611501275019-9b5cda994e8d',
      'photo-1598899134739-24c46f58b8c0',
      'photo-1528460033278-a6ba57020470',
      'photo-1562962230-16e4623d36e6',
      'photo-1568515387631-8b650bbcdb90'
    ]
  },
  bakery: {
    keywords: ['bakery', 'bread', 'pastry', 'cake', 'bake', 'dessert', 'patisserie'],
    images: [
      'photo-1555507036-ab1f4038808a',
      'photo-1509440159596-0249088772ff',
      'photo-1486427944299-d1955d23e34d',
      'photo-1517433670267-08bbd4be890f',
      'photo-1558961363-fa8fdf82db35',
      'photo-1555507036-ab1f4038808a'
    ]
  },
  florist: {
    keywords: ['florist', 'flower', 'bouquet', 'floral', 'flowers', 'arrangement'],
    images: [
      'photo-1490750967868-88aa4486c946',
      'photo-1455659817273-f96807779a8a',
      'photo-1487070183336-b863922373d4',
      'photo-1522441815192-d9f04eb0615c',
      'photo-1563241527-b1e37e4ea75a',
      'photo-1490750967868-88aa4486c946'
    ]
  },
  jewelry: {
    keywords: ['jewelry', 'jewellery', 'gold', 'diamond', 'ring', 'necklace', 'luxury'],
    images: [
      'photo-1515562141207-7a88fb7ce338',
      'photo-1599643478518-a784e5dc4c8f',
      'photo-1611591437281-460bfbe1220a',
      'photo-1535632066927-ab7c9ab60908',
      'photo-1603561591411-07134e71a2a9',
      'photo-1515562141207-7a88fb7ce338'
    ]
  },
  artgallery: {
    keywords: ['art gallery', 'gallery', 'art', 'exhibition', 'museum', 'contemporary art'],
    images: [
      'photo-1577083552792-a0d461cb1dd6',
      'photo-1547826039-bfc35e0f1ea8',
      'photo-1561214115-f2f134cc4912',
      'photo-1578926078968-5edb9e97a47c',
      'photo-1582555172866-f73bb12a2ab3',
      'photo-1577083552792-a0d461cb1dd6'
    ]
  },
  theater: {
    keywords: ['theater', 'theatre', 'drama', 'performance', 'stage', 'play', 'acting'],
    images: [
      'photo-1503095396549-807759245b35',
      'photo-1540575467063-178a50c2df87',
      'photo-1514306191717-452ec28c7814',
      'photo-1507003211169-0a1dd7228f2d',
      'photo-1478720568477-152d9b164e26',
      'photo-1503095396549-807759245b35'
    ]
  },
  cinema: {
    keywords: ['cinema', 'movie', 'film', 'theater', 'screening', 'entertainment'],
    images: [
      'photo-1489599849927-2ee91cede3ba',
      'photo-1543536448-d209d2d13a1c',
      'photo-1585647347384-2593bc35786b',
      'photo-1478720568477-152d9b164e26',
      'photo-1616530940355-351fabd9524b',
      'photo-1489599849927-2ee91cede3ba'
    ]
  },
  yoga: {
    keywords: ['yoga', 'meditation', 'mindfulness', 'wellness', 'zen', 'relaxation'],
    images: [
      'photo-1544367567-0f2fcb009e0b',
      'photo-1506126613408-eca07ce68773',
      'photo-1599901860904-17e6ed7083a0',
      'photo-1545205597-3d9d02c29597',
      'photo-1588286840104-8957b019727f',
      'photo-1544367567-0f2fcb009e0b'
    ]
  },
  martialarts: {
    keywords: ['martial arts', 'karate', 'judo', 'taekwondo', 'dojo', 'combat', 'fighting'],
    images: [
      'photo-1555597673-b21d5c935865',
      'photo-1595078475328-1ab05d0a6a0e',
      'photo-1551958219-acbc608c6377',
      'photo-1549719386-74dfcbf7dbed',
      'photo-1555597408-26bc8e548a46',
      'photo-1555597673-b21d5c935865'
    ]
  },
  dance: {
    keywords: ['dance', 'dancing', 'ballet', 'choreography', 'dancer', 'studio'],
    images: [
      'photo-1508700115892-45ecd05ae2ad',
      'photo-1518834107812-67b0b7c58434',
      'photo-1545322142-f6f1ea5e10f1',
      'photo-1504609773096-104ff2c73ba4',
      'photo-1514306191717-452ec28c7814',
      'photo-1508700115892-45ecd05ae2ad'
    ]
  },
  musicschool: {
    keywords: ['music school', 'music lessons', 'instrument', 'teaching', 'academy'],
    images: [
      'photo-1511379938547-c1f69419868d',
      'photo-1507003211169-0a1dd7228f2d',
      'photo-1514320291840-2e0a9bf2a9ae',
      'photo-1460036521480-ff49c08c2781',
      'photo-1493225457124-a3eb161ffa5f',
      'photo-1511379938547-c1f69419868d'
    ]
  },
  daycare: {
    keywords: ['daycare', 'childcare', 'preschool', 'kids', 'children', 'nursery'],
    images: [
      'photo-1560074334-175c13985e6f',
      'photo-1560869713-bf165a68f88b',
      'photo-1503454537195-1dcabb73ffb9',
      'photo-1587654780291-39c9404d746b',
      'photo-1544776193-352d25ca82cd',
      'photo-1560074334-175c13985e6f'
    ]
  },
  veterinary: {
    keywords: ['veterinary', 'vet', 'animal hospital', 'pet care', 'animal clinic'],
    images: [
      'photo-1576201836106-db1758fd1c97',
      'photo-1601758228041-f3b2795255f1',
      'photo-1628009368231-7bb7cfcb0def',
      'photo-1585664811087-47f65abbad64',
      'photo-1587300003388-59208cc962cb',
      'photo-1576201836106-db1758fd1c97'
    ]
  },
  dentist: {
    keywords: ['dentist', 'dental', 'dentistry', 'teeth', 'oral health', 'orthodontist'],
    images: [
      'photo-1588776814546-1ffcf47267a5',
      'photo-1606811971618-4486d14f3f99',
      'photo-1629909613654-28e377c37b09',
      'photo-1598256989800-fe5f95da9787',
      'photo-1609840114035-3c981407e31f',
      'photo-1588776814546-1ffcf47267a5'
    ]
  },
  accounting: {
    keywords: ['accounting', 'accountant', 'finance', 'bookkeeping', 'tax', 'cpa'],
    images: [
      'photo-1554224311-beee460c201f',
      'photo-1554224154-26032ffc0d07',
      'photo-1460925895917-afdab827c52f',
      'photo-1450101499163-c8848c66ca85',
      'photo-1507679799987-c73779587ccf',
      'photo-1554224311-beee460c201f'
    ]
  },
  insurance: {
    keywords: ['insurance', 'policy', 'coverage', 'protection', 'agent', 'broker'],
    images: [
      'photo-1450101499163-c8848c66ca85',
      'photo-1551836022-4c4c79ecde51',
      'photo-1454165804606-c3d57bc86b40',
      'photo-1434626881859-194d67b2b86f',
      'photo-1579621970563-ebec7560ff3e',
      'photo-1450101499163-c8848c66ca85'
    ]
  },
  financial: {
    keywords: ['financial advisor', 'wealth', 'investment', 'planning', 'advisor'],
    images: [
      'photo-1579621970563-ebec7560ff3e',
      'photo-1579621970588-a35d0e7ab9b6',
      'photo-1565514020179-026b92b84f3b',
      'photo-1460925895917-afdab827c52f',
      'photo-1554224311-beee460c201f',
      'photo-1579621970563-ebec7560ff3e'
    ]
  },
  marketing: {
    keywords: ['marketing', 'advertising', 'digital marketing', 'branding', 'promotion'],
    images: [
      'photo-1533750349088-cd871a92f312',
      'photo-1523474253046-8cd2748b5fd2',
      'photo-1557804506-669a67965ba0',
      'photo-1552664730-d307ca884978',
      'photo-1460925895917-afdab827c52f',
      'photo-1533750349088-cd871a92f312'
    ]
  },
  architecture: {
    keywords: ['architecture', 'architect', 'design', 'building design', 'structural'],
    images: [
      'photo-1503387762-592deb58ef4e',
      'photo-1487958449943-2562d180c825',
      'photo-1511818966892-d7d671e672a2',
      'photo-1486718448742-163732cd1544',
      'photo-1448630360428-65456885c650',
      'photo-1503387762-592deb58ef4e'
    ]
  },
  interiordesign: {
    keywords: ['interior design', 'interior', 'home decor', 'furniture', 'decoration'],
    images: [
      'photo-1618221195710-dd6b41faaea6',
      'photo-1586023492125-27b2c045efd7',
      'photo-1616486338812-3dadae4b4ace',
      'photo-1616137466211-f939a420be84',
      'photo-1615873968403-89e068629265',
      'photo-1618221195710-dd6b41faaea6'
    ]
  },
  eventplanning: {
    keywords: ['event planning', 'planner', 'party', 'celebration', 'coordinator'],
    images: [
      'photo-1511578314322-379afb476865',
      'photo-1505236858219-8359eb29e329',
      'photo-1530103862676-de8c9debad1d',
      'photo-1464366400600-7168b8af9bc3',
      'photo-1519167758481-83f29da8ae39',
      'photo-1511578314322-379afb476865'
    ]
  },
  catering: {
    keywords: ['catering', 'food service', 'buffet', 'banquet', 'chef', 'culinary service'],
    images: [
      'photo-1555939594-58d7cb561ad1',
      'photo-1540189549336-e6201ad3bc70',
      'photo-1414235077428-338989a2e8c0',
      'photo-1551782450-17144efb9c50',
      'photo-1504674900247-0877df9cc836',
      'photo-1555939594-58d7cb561ad1'
    ]
  },
  winebar: {
    keywords: ['wine bar', 'wine', 'vineyard', 'sommelier', 'tasting', 'cellar'],
    images: [
      'photo-1510812431401-41d2bd2722f3',
      'photo-1565299543923-37dd37887442',
      'photo-1569949381669-ecf31ae8e613',
      'photo-1586313651513-60c7f4082560',
      'photo-1572490122747-3968b75cc699',
      'photo-1510812431401-41d2bd2722f3'
    ]
  },
  nightclub: {
    keywords: ['nightclub', 'club', 'party', 'dance', 'dj', 'nightlife', 'entertainment'],
    images: [
      'photo-1514525253161-7a46d19cd819',
      'photo-1518929458119-e5bf444c30f4',
      'photo-1470225620780-dba8ba36b745',
      'photo-1571266028243-d220c6c2e3e3',
      'photo-1516450360452-9312f5e86fc7',
      'photo-1514525253161-7a46d19cd819'
    ]
  },
  barbershop: {
    keywords: ['barber', 'barbershop', 'haircut', 'shave', 'grooming', 'men'],
    images: [
      'photo-1585747860715-2ba37e788b70',
      'photo-1503951914875-452162b0f3f1',
      'photo-1622286346003-c3fbe8b7a138',
      'photo-1621605815971-fbc98d665033',
      'photo-1599351431202-1e0f0137899a',
      'photo-1585747860715-2ba37e788b70'
    ]
  }
};

// ============================================
// IMAGE MATCHING FUNCTION
// ============================================
/**
 * Get images for a given topic by matching keywords
 * @param {string} prompt - User's website description/prompt
 * @returns {Array<string>} - Array of 6 image photo IDs
 */
export function getImagesForTopic(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    return IMAGE_LIBRARY.business.images; // Default fallback
  }
  const lowerPrompt = prompt.toLowerCase();
 
  // Check each topic's keywords for matches
  for (const [topic, data] of Object.entries(IMAGE_LIBRARY)) {
    const keywordMatches = data.keywords.some(keyword =>
      lowerPrompt.includes(keyword.toLowerCase())
    );
   
    if (keywordMatches) {
      console.log(`✅ Matched topic: ${topic}`);
      return data.images;
    }
  }
 
  // No match found - return generic business images
  console.log('⚠️ No topic match - using generic business images');
  return IMAGE_LIBRARY.business.images;
}
/**
 * Build full Unsplash URL from photo ID
 * @param {string} photoId - Unsplash photo ID (e.g., 'photo-1234567890')
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {string} - Full Unsplash URL
 */
export function buildImageUrl(photoId, width = 800, height = 600) {
  return `https://images.unsplash.com/${photoId}?w=${width}&h=${height}&fit=crop&q=80`;
}
/**
 * Get all images with full URLs for a topic
 * @param {string} prompt - User's website description
 * @param {Object} sizes - Image size configuration
 * @returns {Object} - Object with hero, card, and thumbnail URLs
 */
export function getImageSet(prompt, sizes = {}) {
  const photoIds = getImagesForTopic(prompt);
 
  const defaultSizes = {
    hero: { width: 1920, height: 1080 },
    card: { width: 800, height: 600 },
    thumbnail: { width: 400, height: 400 }
  };
 
  const finalSizes = { ...defaultSizes, ...sizes };
 
  return {
    hero: buildImageUrl(photoIds[0], finalSizes.hero.width, finalSizes.hero.height),
    images: photoIds.slice(1).map(id =>
      buildImageUrl(id, finalSizes.card.width, finalSizes.card.height)
    ),
    thumbnails: photoIds.map(id =>
      buildImageUrl(id, finalSizes.thumbnail.width, finalSizes.thumbnail.height)
    )
  };
}
// Export everything
export default IMAGE_LIBRARY;
