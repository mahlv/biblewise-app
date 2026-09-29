/**
 * Dados iniciais das Escrituras.
 *
 * No MVP usamos um subconjunto curado por tradução livre em português. A ideia é
 * trocar este arquivo por um import completo (JSONL via `npx convex import`) ou
 * por uma API licenciada de tradução bíblica mais adiante.
 *
 * Cada item é `[livro, capítulo, versículo, texto]` para manter o arquivo enxuto.
 */
export const VERSICULOS_INICIAIS: ReadonlyArray<readonly [string, number, number, string]> = [
  // ---------------------------------- Antigo Testamento ----------------------------------
  [
    'Gênesis',
    1,
    1,
    'No princípio criou Deus os céus e a terra.',
  ],
  [
    'Gênesis',
    1,
    3,
    'E disse Deus: Haja luz; e houve luz.',
  ],
  [
    'Salmos',
    23,
    1,
    'O Senhor é o meu pastor; nada me faltará.',
  ],
  [
    'Salmos',
    23,
    2,
    'Deitar-me faz em verdes pastos, guia-me mansamente a águas tranquilas.',
  ],
  [
    'Salmos',
    23,
    4,
    'Ainda que eu andasse pelo vale da sombra da morte, não temeria mal algum, porque tu estás comigo; a tua vara e o teu cajado me consolam.',
  ],
  [
    'Salmos',
    46,
    1,
    'Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia.',
  ],
  [
    'Salmos',
    91,
    1,
    'Aquele que habita no esconderijo do Altíssimo, à sombra do Onipotente descansará.',
  ],
  [
    'Salmos',
    119,
    105,
    'Lâmpada para os meus pés é a tua palavra, e luz para o meu caminho.',
  ],
  [
    'Provérbios',
    3,
    5,
    'Confia no Senhor de todo o teu coração, e não te estribes no teu próprio entendimento.',
  ],
  [
    'Provérbios',
    3,
    6,
    'Reconhece-o em todos os teus caminhos, e ele endireitará as tuas veredas.',
  ],
  [
    'Isaías',
    40,
    31,
    'Mas os que esperam no Senhor renovarão as suas forças, subirão com asas como águias; correrão, e não se cansarão; caminharão, e não se fatigarão.',
  ],
  [
    'Isaías',
    41,
    10,
    'Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus; eu te fortaleço, e te ajudo, e te sustento com a destra da minha justiça.',
  ],
  [
    'Jeremias',
    29,
    11,
    'Porque eu bem sei os pensamentos que penso de vós, diz o Senhor; pensamentos de paz, e não de mal, para vos dar o fim que esperais.',
  ],

  // ---------------------------------- Novo Testamento -----------------------------------
  [
    'Mateus',
    5,
    16,
    'Assim resplandeça a vossa luz diante dos homens, para que vejam as vossas boas obras e glorifiquem a vosso Pai, que está nos céus.',
  ],
  [
    'Mateus',
    6,
    33,
    'Mas buscai primeiro o reino de Deus, e a sua justiça, e todas estas coisas vos serão acrescentadas.',
  ],
  [
    'Mateus',
    11,
    28,
    'Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.',
  ],
  [
    'Marcos',
    16,
    15,
    'E disse-lhes: Ide por todo o mundo, pregai o evangelho a toda criatura.',
  ],
  [
    'Lucas',
    6,
    31,
    'E como vós quereis que os homens vos façam, da mesma maneira lhes fazei vós também.',
  ],
  [
    'João',
    1,
    1,
    'No princípio era o Verbo, e o Verbo estava com Deus, e o Verbo era Deus.',
  ],
  [
    'João',
    3,
    16,
    'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.',
  ],
  [
    'João',
    3,
    17,
    'Porque Deus enviou o seu Filho ao mundo, não para que condenasse o mundo, mas para que o mundo fosse salvo por ele.',
  ],
  [
    'João',
    14,
    6,
    'Disse-lhe Jesus: Eu sou o caminho, e a verdade e a vida; ninguém vem ao Pai, senão por mim.',
  ],
  [
    'Romanos',
    3,
    23,
    'Porque todos pecaram e destituídos estão da glória de Deus.',
  ],
  [
    'Romanos',
    6,
    23,
    'Porque o salário do pecado é a morte, mas o dom gratuito de Deus é a vida eterna, por Cristo Jesus nosso Senhor.',
  ],
  [
    'Romanos',
    8,
    28,
    'E sabemos que todas as coisas contribuem juntamente para o bem daqueles que amam a Deus, daqueles que são chamados por seu decreto.',
  ],
  [
    '1 Coríntios',
    13,
    4,
    'O amor é sofredor, é benigno; o amor não é invejoso; não trata com leviandade, não se ensoberbece.',
  ],
  [
    '1 Coríntios',
    13,
    13,
    'Agora, pois, permanecem a fé, a esperança e o amor, mas o maior destes é o amor.',
  ],
  [
    'Filipenses',
    4,
    6,
    'Não estejais inquietos por coisa alguma; antes as vossas petições sejam em tudo conhecidas diante de Deus pela oração e súplica, com ação de graças.',
  ],
  [
    'Filipenses',
    4,
    13,
    'Posso todas as coisas naquele que me fortalece.',
  ],
  [
    'Hebreus',
    11,
    1,
    'Ora, a fé é o firme fundamento das coisas que se esperam, e a prova das coisas que não se veem.',
  ],
  [
    'Apocalipse',
    21,
    4,
    'E Deus limpará de seus olhos toda a lágrima; e não haverá mais morte, nem pranto, nem clamor, nem dor; porque já as primeiras coisas são passadas.',
  ],
];

/**
 * Catálogo enxuto de capítulos: usado para gravar `books.totalCapitulos`
 * sem precisar importar a Bíblia inteira neste primeiro momento.
 *
 * Livros ausentes aqui caem no valor padrão `1` em `convex/seed.ts` — ajuste
 * conforme a Bíblia completa for importada.
 */
export const TOTAL_CAPITULOS: Readonly<Record<string, number>> = {
  Gênesis: 50,
  Salmos: 150,
  Provérbios: 31,
  Isaías: 66,
  Jeremias: 52,
  Mateus: 28,
  Marcos: 16,
  Lucas: 24,
  João: 21,
  Romanos: 16,
  '1 Coríntios': 16,
  Filipenses: 4,
  Hebreus: 13,
  Apocalipse: 22,
};
