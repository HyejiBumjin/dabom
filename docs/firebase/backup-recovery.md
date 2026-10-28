# Firestore 백업과 복구 절차

설정일: 2026-10-28. 프로젝트 `dabom-10a35`, 운영 DB `(default)`, 위치 `asia-northeast3`(서울).

## 백업 설정

- 네이티브 **일일 백업**, 백업별 **7일(604800초)** 보관. 일정 ID `b6151166-f849-4802-a878-029b8dd7876e`.
- DB 전체 삭제 방지 사용. 개별 개인정보 삭제·법정 TTL은 그대로 동작한다.
- 7일 PITR은 비활성. Google 기본 최근 1시간 복구 기능과 정기 백업은 다른 기능이다.
- 시간은 Google이 결정한다. 일정 생성 성공과 실제 백업 `READY` 확인은 구분한다. 첫 백업이 생성되기 전에는 백업에서 복원했다고 보고하지 않는다.
- 서울 리전의 백업 저장량·유지시간, 복원/복제 데이터량과 별도 DB 저장/읽기/쓰기 비용이 발생한다. 초기 DB 크기만 보고 미래 고정 금액을 약속하지 않는다. [공식 요금](https://cloud.google.com/firestore/pricing).
- 당직/담당자는 영업일마다 아래 목록에서 최신 `READY` 백업과 `snapshotTime`, `expireTime`을 확인한다. 48시간 이상 최신 백업이 없거나 실패하면 장애로 처리한다. 이메일 경보나 자동 재시도 시스템을 구성한 것은 아니다.

```sh
firebase firestore:backups:schedules:list --database '(default)' --project dabom-10a35
firebase firestore:backups:list --location asia-northeast3 --project dabom-10a35
```

## 운영 데이터를 덮어쓰지 않는 복원

1. 신규 결제·생성·데이터 변경을 중단하는 점검 계획을 먼저 세운다. 운영 DB를 먼저 지우지 않는다. 삭제 방지를 임의로 끄지 않는다.
2. 백업 위치·DB·시각·완료 상태를 확인하고 **새 `dabom-restore-...` DB**로 복원한다. 앱은 계속 `(default)`에 고정되어 있어 자동 전환되지 않는다.
3. IAM 최소 권한, `firestore.rules`의 직접 읽기/쓰기 전면 거부, `firestore.indexes.json` 인덱스/TTL을 별도 DB에 적용·확인한다. **TTL은 백업에서 자동 복원되지 않는다.** 앱 실행 계정에 백업 관리 권한을 부여하지 않는다.
4. 현재 DB의 삭제 작업/요청·보존 거래 증빙을 확보한다. 최신 삭제 기록이 손실되었거나 출처·완전성을 확인할 수 없으면 **운영 복원을 중단**한다. 오래된 백업 안의 삭제 목록만으로 진행하지 않는다. 전체 프로젝트 상실을 복구하는 독립 보관소/다른 프로젝트 백업은 아직 구성하지 않았다.
5. 아래 정리 도구를 dry run 후 실행한다. 도구는 운영 DB를 읽기만 하고, 명명 규칙을 통과한 별도 복구 DB에만 쓴다. 최신 삭제 기록을 읽지 못하면 중단하며 과거 로그인 세션·OAuth·요청 제한을 폐기한다. 삭제 계정의 프로필·리포트·주문·동의를 제거하고 법정 증빙은 최신 상태로 맞춘다. 만료 증빙은 삭제하고 `legalHold`는 유지한다.
6. 같은 카카오 ID로 다시 가입했더라도 삭제 전 스냅샷이면 제거한다. 삭제 후 가입한 자료는 현재 계정의 가입 시점·`dataEpoch`가 일치해야 유지한다. 불명확한 경우 자동으로 살리지 않는다. 모든 삭제 상태·계정 상태를 계획 단계에서 확인한다.
7. 실행 중 현재 계정/삭제/보존 기록이 바뀌면 `LIVE_LEDGER_CHANGED_RERUN`으로 중단한다. 완료 표시도 `REVIEW_REQUIRED`이며 서비스 개방 승인이 아니다. 점검 창에서 마지막 변경분을 다시 확인한다.
8. **결제 상태는 별도 대조**한다. PortOne 승인/취소/환불과 복원 주문을 비교하여 스냅샷 이후 취소된 주문이 재사용되지 않게 한다. 생성 중이던 작업·잠금·정책 버전·소유권·실제 출력·TTL 활성화·최신 삭제 반영을 검증한다. 고객의 결제를 반복 실행하거나 LLM을 일괄 재호출하지 않는다.
9. 새 DB 연결 또는 데이터를 운영으로 옮기는 작업은 별도 검토·배포 계획으로 실행한다. 이 도구는 DB 전환·Auth 재생성·결제·메일·LLM 호출을 하지 않는다.
10. 복구 연습용 DB는 결과 기록 후 제거한다. 고객 사본을 로컬 파일/Git에 내려받지 않는다.

```sh
# BACKUP_RESOURCE는 목록에서 확인한 projects/.../locations/.../backups/... 값
firebase firestore:databases:restore --database dabom-restore-YYYYMMDD --backup BACKUP_RESOURCE --project dabom-10a35

# 운영 DB를 절대 대상에 넣을 수 없는 정리 도구
npm run privacy:recovery -- --target dabom-restore-YYYYMMDD
npm run privacy:recovery -- --target dabom-restore-YYYYMMDD --apply --isolated-confirmed --latest-ledger-confirmed

# 네트워크 없는 복구 판정 검사
npm run privacy:recovery-check
```

첫 정기 백업이 아직 없을 때 최근 1시간의 온전한 분 단위 시점을 새 DB로 복제하여 정리 절차를 검증할 수 있다. 이것은 **정기 백업 파일 복원 검증을 대체하지 않는다**.

```sh
firebase firestore:databases:clone '(default)' dabom-restore-YYYYMMDD --snapshot-time VERIFIED_UTC_MINUTE --project dabom-10a35
```

## 범위와 한계

- Firestore 백업은 DB/인덱스 대상이다. Firebase Auth 계정, Secret Manager, 결제사 거래 원장, 도메인, IAM, Google 계정 복구까지 포함하는 전체 서비스 백업이 아니다.
- 삭제 요청은 DB 삭제 후에도 관리자 제한 백업에 만료까지 남을 수 있다. 복구 시 최신 요청을 재반영하기 전까지 고객에게 노출하지 않는다.
- 현재 도구는 **현재 운영 DB와 최신 삭제 기록을 읽을 수 있는 장애**를 위한 것이다. 최신 증빙을 잃은 전체 손실 상태에서 임의 복원하는 기능이 아니다.
- [공식 백업/복원](https://firebase.google.com/docs/firestore/backups), [복구 계획](https://firebase.google.com/docs/firestore/disaster-recovery).

## 2026-10-28 검증 기록

- 일일/7일 일정 생성 후 조회로 확인. 첫 네이티브 백업 생성 대기.
- 23:29 UTC 시점으로 서울의 `dabom-restore-drill-20261028`를 복제, 23:42:49 UTC SUCCESSFUL(약 11분 41초). 운영 DB 및 앱 연결은 변경하지 않음.
- 복구 검사 36건 통과: 원본 해당 시점과 users/profiles/reports/orders/legalRecords를 메모리 안의 해시로 대조하여 일치 확인. 개인정보를 파일로 내보내지 않음. 양 네임스페이스의 합성 삭제 대상 제거·다른 계정 보존·법정 증빙 유지, 운영 DB 쓰기 차단 포함. 기존 삭제/보존 30건과 보안 151건 통과.
- 복구 DB에 직접 접근을 전면 거부하는 규칙을 배포하고 실제 연결된 규칙 원문 일치를 확인했다. 12개 TTL 정책 모두 ACTIVE. 정리 도구 실행으로 세션 등 임시 기록 5건을 제거하고 두 네임스페이스의 6개 임시 컬렉션이 모두 0건임을 확인했다. 정리 상태는 REVIEW_REQUIRED이며 운영 전환을 하지 않았다.
- 23:53:38 UTC 복구 연습 DB 삭제 완료. 고객 사본과 합성 검증 자료를 함께 정리했다. 운영 DB의 데이터·연결 및 정기 백업 일정은 유지한다.
