# 운동 데이터와 근육 도식

기존 keep_healthy의 운동 카탈로그를 중복 제거해 382개 종목으로 정리했습니다. 이름을 기반으로 만든 `ex-N` ID는 기존 순서를 유지합니다. 향후 카탈로그를 수정할 때 ID를 재생성하지 말고 영구 ID를 유지해야 합니다.

주동근과 보조근은 운동 설명의 분류이며, 측정한 개인별 근활성 값이 아닙니다. 입력한 중량은 덤벨 한 개, 바벨 전체, 머신 표시 중량 등 운동마다 일관된 기준으로 기록해야 합니다. 서로 다른 기구의 저항을 하나의 최대 중량으로 취급하지 않습니다.

## 도식

[react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter)의 MIT 라이선스 남성 앞/뒤 SVG 경로를 사용했습니다. 원본 고정 리비전: `15df9e2dbc621450001960bed5a30e6a75357faa`. 저작권과 라이선스는 `public/MUSCLE-LICENSE.txt`에 보존했습니다.

- 앞면 89개, 뒷면 70개 경로를 사용합니다.
- 코랄은 주동근, 골드는 보조근입니다. 색과 함께 텍스트를 표시합니다.
- 광배근은 등 바깥쪽의 해당 두 경로에 매핑합니다. 능형근/등 상부와 구분합니다.
- 전면/측면 삼각근은 같은 전면 어깨 윤곽을 공유하지만 텍스트와 운동 분류는 구분합니다. 후면 삼각근은 뒷면에 표시합니다.
- 대흉근 상부/중부/하부는 같은 가슴 윤곽을 사용하므로 강조 부위는 텍스트로 설명합니다.
- 중둔근/소둔근 등 깊은 근육은 독립적으로 표현하지 못합니다. 의료용 해부도나 운동 자세 사진을 대신하지 않습니다.

## 검토한 기준 자료

- [ACE: Lateral Raise](https://www.acefitness.org/resources/everyone/exercise-library/26/lateral-raise/) — 측면 들기 동작과 자세 확인
- [ACE: Seated Lat Pulldown](https://www.acefitness.org/resources/everyone/exercise-library/158/seated-lat-pulldown/) — 수직 당기기와 동작 범위 설명
- [ACE의 어깨 운동 비교 연구](https://www.acefitness.org/continuing-education/prosource/september-2014/4972/dynamite-delts-ace-research-identifies-top-shoulder-exercises/) — 삼각근 전면·측면·후면을 구분해야 하는 근거
- [ACE의 등 운동 비교 연구](https://www.acefitness.org/continuing-education/certified/special-dec-2018-issue/7146/ace-sponsored-research-what-is-the-best-back-exercise/) — 광배근과 등 상부를 포함한 운동 간 차이

자료는 분류 검토에 사용했으며, 모든 변형 종목을 개별 검증했다는 의미는 아닙니다. 기존 운동별 설명을 이어받고 주요 패턴과 잘못된 분류를 보정했습니다. 통증/재활을 위한 개인 처방 기능은 없습니다.

## 기록 계산

- 중량 볼륨: 완료한 중량 운동의 본세트/드롭세트 `입력 kg × 횟수`. 워밍업, 미완료, 맨몸/보조 중량, 유산소는 제외합니다. 덤벨 양쪽이나 편측 반복을 자동으로 두 배 계산하지 않습니다.
- 추정 1RM: 1회는 실제 입력 중량, 2~12회는 Epley 식. 고반복은 추정에서 제외합니다. 실제 최대 중량 테스트를 요구하는 기능이 아닙니다.
- 중량 제안: 같은 기구의 최근 본세트가 같은 중량이고 모든 세트가 상한 횟수와 RPE 8 이하를 만족할 때만 최소 단위 변경을 제안합니다. 보조 머신은 보조 중량을 낮춥니다. 최초 기록에 임의의 40kg 등을 넣지 않습니다.
- 한국 날짜: Asia/Seoul 기준으로 묶습니다.
