# Spec Delta

## Purpose

Apresenta o BibleWise na primeira execução e coleta duas informações do fiel — faixa etária e denominação — para personalizar versões bíblicas, planos de leitura e trilhas de conteúdo. O fluxo é anonymous-first: sem login, as escolhas são gravadas no backend em um registro de usuário anônimo identificado por um UUID do dispositivo, preparado para ser vinculado a uma conta no futuro.

## ADDED Requirements

### Requirement: Tela de boas-vindas

O aplicativo SHALL apresentar uma tela de boas-vindas como primeira tela do fluxo de primeira execução, contendo a identidade do produto, uma área visual principal, prova social e os três benefícios do aplicativo.

#### Scenario: Fiel abre o aplicativo pela primeira vez

- **WHEN** a tela de boas-vindas é exibida
- **THEN** ela mostra o nome do produto, uma área visual principal, um selo de destaque, indicadores de avaliação e de quantidade de usuários
- **AND** mostra os três benefícios: leitura da Bíblia digital personalizada, escuta de testemunhos reais e escrita da própria história

#### Scenario: Fiel avança a partir das boas-vindas

- **WHEN** o fiel aciona o botão de continuar
- **THEN** o aplicativo avança para a primeira etapa do onboarding, que é a seleção de faixa etária

### Requirement: Seleção de faixa etária

O aplicativo SHALL oferecer exatamente seis faixas etárias — 13–17, 18–24, 25–34, 35–44, 45–54 e 55+ — e SHALL permitir escolher uma única opção.

#### Scenario: Escolha de uma faixa etária

- **WHEN** o fiel toca em uma faixa etária
- **THEN** aquela opção passa a ser exibida como selecionada
- **AND** qualquer opção antes selecionada deixa de estar selecionada

#### Scenario: Troca de faixa etária

- **WHEN** o fiel toca em uma faixa etária diferente da atual
- **THEN** apenas a nova faixa permanece selecionada
- **AND** a escolha anterior é descartada

#### Scenario: Avanço sem escolha

- **WHEN** o fiel aciona continuar sem ter selecionado nenhuma faixa etária
- **THEN** o aplicativo não avança para a etapa seguinte
- **AND** o fiel recebe indicação de que uma escolha é necessária

### Requirement: Seleção de denominação

O aplicativo SHALL oferecer as opções de denominação Católica, Evangélica, Protestante, Pentecostal, Protestante Não Denominacional, Ortodoxa e Outra / Em busca da fé, e SHALL permitir escolher uma única opção.

#### Scenario: Escolha de uma denominação

- **WHEN** o fiel toca em uma denominação
- **THEN** aquela opção passa a ser exibida como selecionada
- **AND** qualquer opção antes selecionada deixa de estar selecionada

#### Scenario: Opção padrão sugerida

- **WHEN** a tela de denominação é exibida pela primeira vez
- **THEN** a opção Evangélica aparece marcada como sugestão padrão
- **AND** o fiel pode alterar a escolha livremente

#### Scenario: Selo da opção padrão

- **WHEN** a opção Evangélica está selecionada
- **THEN** ela exibe o selo "Padrão"

#### Scenario: Conclusão do onboarding

- **WHEN** o fiel confirma a denominação e aciona continuar
- **THEN** o registro anônimo é gravado no backend e o onboarding é registrado como concluído
- **AND** o aplicativo avança para a área principal sem deixar o onboarding no histórico de navegação

### Requirement: Indicador de progresso do onboarding

O onboarding SHALL indicar visualmente em qual das duas etapas o fiel está, usando uma barra de progresso.

#### Scenario: Exibição da primeira etapa

- **WHEN** a etapa de faixa etária é exibida
- **THEN** o indicador mostra a primeira de duas etapas, com a barra parcialmente preenchida

#### Scenario: Exibição da segunda etapa

- **WHEN** a etapa de denominação é exibida
- **THEN** o indicador mostra a segunda de duas etapas, com a barra totalmente preenchida

#### Scenario: Retorno à etapa anterior

- **WHEN** o fiel aciona o botão de voltar na segunda etapa
- **THEN** a etapa de faixa etária é exibida novamente
- **AND** a faixa etária escolhida anteriormente continua selecionada

### Requirement: Registro de usuário anônimo no backend

Ao concluir o onboarding, o aplicativo SHALL criar no backend um registro de usuário com um `anonymousId` (UUID v4 gerado no dispositivo), a faixa etária, a denominação, `onboardingCompleted: true` e os timestamps de criação e atualização. O registro SHALL ter um campo opcional `clerkId` para o vínculo futuro com uma conta, que NÃO é implementado nesta mudança.

#### Scenario: Primeira conclusão cria o usuário

- **WHEN** o fiel conclui o onboarding pela primeira vez no dispositivo
- **THEN** um único registro de usuário é criado com o `anonymousId` do dispositivo e as escolhas feitas

#### Scenario: Refazer o onboarding não duplica o usuário

- **WHEN** o fiel refaz o onboarding no mesmo dispositivo
- **THEN** o registro existente com o mesmo `anonymousId` é atualizado com as novas escolhas
- **AND** nenhum segundo registro é criado

#### Scenario: Valores inválidos são recusados

- **WHEN** o backend recebe um `anonymousId` que não é UUID v4, ou uma faixa etária ou denominação fora das listas oferecidas
- **THEN** a gravação é recusada

#### Scenario: Registro já vinculado a uma conta

- **WHEN** o registro com aquele `anonymousId` já possui `clerkId`
- **THEN** a gravação anônima é recusada

#### Scenario: Falha ao gravar no backend

- **WHEN** a gravação no backend falha
- **THEN** o fiel permanece na etapa de denominação com uma mensagem de erro não técnica
- **AND** pode tentar novamente sem perder as escolhas feitas

### Requirement: Persistência local da identidade e da conclusão

O aplicativo SHALL guardar no armazenamento local do dispositivo o `anonymousId` e a marca de conclusão do onboarding, e SHALL sobreviver ao fechamento e reabertura do aplicativo. A marca de conclusão SHALL ser gravada somente depois que o backend confirmar o registro.

#### Scenario: Conclusão sobrevive ao reinício

- **WHEN** o fiel conclui o onboarding e fecha o aplicativo
- **AND** abre o aplicativo novamente
- **THEN** o fiel vai direto para a área principal, sem repetir o onboarding
- **AND** o mesmo `anonymousId` continua salvo

#### Scenario: Dados locais ausentes ou corrompidos

- **WHEN** o aplicativo inicia e os dados de onboarding estão ausentes, ilegíveis ou corrompidos
- **THEN** o aplicativo trata o fiel como primeira execução
- **AND** exibe o fluxo de onboarding novamente, sem apresentar erro

### Requirement: Refazer onboarding (teste)

A área principal provisória SHALL oferecer uma ação "Refazer onboarding" que limpa apenas a marca local de conclusão, preservando o `anonymousId`.

#### Scenario: Fiel refaz o onboarding

- **WHEN** o fiel aciona "Refazer onboarding"
- **THEN** o aplicativo volta para a tela de boas-vindas
- **AND** o `anonymousId` salvo no dispositivo não muda
