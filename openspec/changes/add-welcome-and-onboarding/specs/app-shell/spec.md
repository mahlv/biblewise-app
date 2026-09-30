# Spec Delta

## Purpose

Fornece a fundação de navegação e os providers globais do BibleWise, para que toda tela nova seja apenas um arquivo de rota e nenhuma tela precise se preocupar com cliente de backend, fontes ou área segura do dispositivo.

## ADDED Requirements

### Requirement: Rota raiz do aplicativo

O aplicativo SHALL usar um roteador de arquivos como raiz de navegação, de modo que cada tela corresponda a um arquivo na árvore de rotas. O ponto de entrada SHALL NOT renderizar uma tela de conteúdo diretamente.

#### Scenario: Aplicativo inicia pela pilha de navegação

- **WHEN** o aplicativo é aberto
- **THEN** a primeira tela exibida é resolvida pelo roteador a partir da árvore de rotas
- **AND** nenhuma tela é montada fora do roteador

#### Scenario: Tela existente de busca continua acessível

- **WHEN** o fiel conclui o onboarding e chega à área principal
- **THEN** a área principal é uma Home provisória ("Home em construção") que exibe, abaixo do aviso, a tela de busca por referência bíblica com o mesmo comportamento de antes desta mudança
- **AND** a busca continua consultando o backend existente sem alteração de contrato

### Requirement: Providers globais acima da navegação

O cliente de backend SHALL ser provido uma única vez, acima do roteador, de forma que qualquer rota possa consumir dados sem recriar conexão.

#### Scenario: Rota consome dados do backend

- **WHEN** uma tela dentro do roteador executa uma consulta ao backend
- **THEN** a consulta é atendida pelo mesmo cliente provido na raiz
- **AND** navegar entre telas não reestabelece a conexão do cliente

### Requirement: Tipografia carregada antes do primeiro conteúdo

As fontes do design system SHALL estar carregadas antes de qualquer tela com texto ser exibida, para evitar troca visível de tipografia na primeira renderização.

#### Scenario: Primeira abertura do aplicativo

- **WHEN** o aplicativo inicia e as fontes ainda não estão prontas
- **THEN** nenhuma tela de conteúdo é exibida
- **AND** as telas aparecem somente depois que as fontes terminam de carregar

#### Scenario: Falha ao carregar fontes

- **WHEN** o carregamento das fontes falha por qualquer motivo
- **THEN** o aplicativo exibe a interface com a tipografia de sistema do dispositivo
- **AND** não trava nem permanece em tela vazia indefinidamente

### Requirement: Resolução da rota inicial

O aplicativo SHALL determinar a rota inicial a partir da marca de conclusão do onboarding persistida no dispositivo, sem consultar a rede. Enquanto a marca não for lida, nenhuma rota SHALL ser exibida.

#### Scenario: Primeira execução sem escolhas salvas

- **WHEN** o aplicativo inicia e não há marca de conclusão persistida
- **THEN** a rota inicial é a tela de boas-vindas

#### Scenario: Execução com onboarding já concluído

- **WHEN** o aplicativo inicia e a marca de conclusão está persistida
- **THEN** a rota inicial é a área principal do aplicativo
- **AND** nenhuma tela do fluxo de onboarding é exibida

#### Scenario: Acesso a rota não permitida

- **WHEN** o fiel tenta acessar uma tela do onboarding já concluído, ou a área principal sem ter concluído o onboarding
- **THEN** o aplicativo redireciona para a rota permitida pelo estado atual

### Requirement: Área segura respeitada

As telas SHALL respeitar as áreas não utilizáveis da tela do dispositivo (entalhe, barra de status, indicador inferior).

#### Scenario: Conteúdo em dispositivo com entalhe

- **WHEN** uma tela é exibida em um dispositivo com entalhe ou barra de gestos
- **THEN** nenhum texto ou botão é encoberto por elementos do sistema
- **AND** o conteúdo continua rolável até o fim quando excede a altura visível
