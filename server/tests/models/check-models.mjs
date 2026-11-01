// ============================================================================
// Kiểm tra 6 Core Models — CHỈ TRONG BỘ NHỚ, KHÔNG cần MongoDB (2B.1).
// Chạy: node server/tests/models/check-models.mjs
//
// - Import 6 Models, kiểm tra tên Model + collection mapping (2A.4 CN1).
// - Kiểm tra schema paths + index đã khai báo (schema.indexes()).
// - Tạo document mẫu + validateSync / validate (pre-validate hooks) trong memory.
// - Kiểm tra các trường hợp HỢP LỆ và KHÔNG HỢP LỆ.
// - KHÔNG lưu vào DB, KHÔNG gọi mongoose.connect(), KHÔNG tạo collection/index.
// ============================================================================
import {
  User,
  Studio,
  StudioMember,
  Room,
  Service,
  AvailabilityException,
} from "../../models/index.js";
import { Types } from "mongoose";

let passed = 0;
let failed = 0;
const failures = [];

function check(label, cond) {
  if (cond) {
    passed += 1;
    console.log(`  ok  ${label}`);
  } else {
    failed += 1;
    failures.push(label);
    console.log(`FAIL  ${label}`);
  }
}

function expectValid(label, doc) {
  // validate() chạy full hook chain (gồm pre-validate) rồi mới validateSync;
  // KHÔNG gọi save() → không chạm MongoDB.
  return doc
    .$validate()
    .then(() => {
      check(label, true);
    })
    .catch((err) => {
      check(`${label} (unexpectedly invalid: ${err.message})`, false);
    });
}

function expectInvalid(label, doc, reasonRe) {
  return doc
    .$validate()
    .then(() => {
      check(`${label} (expected invalid but passed: ${reasonRe?.source ?? "?"})`, false);
    })
    .catch((err) => {
      const ok =
        reasonRe === undefined || reasonRe.test(err.message) || err.message.includes("invalid") || err.name === "ValidationError";
      check(`${label} → invalid như mong đợi (${err.message.slice(0, 90)})`, ok);
    });
}

const uid = () => new Types.ObjectId().toHexString();
const now = new Date();

const baseUser = () => ({
  name: "Nguyễn Văn A",
  email: "a@example.com",
  passwordHash: "$argon2id$v19$fake-hash",
  role: "CUSTOMER",
  status: "ACTIVE",
});

const baseScheduling = () => ({
  timezone: "Asia/Ho_Chi_Minh",
  weekdays: [
    { weekday: 1, openMinutes: 540, closeMinutes: 1020 },
    { weekday: 7, openMinutes: 540, closeMinutes: 780 },
  ],
  startStepMinutes: 30,
  minDurationMinutes: 30,
  maxDurationMinutes: 240,
  bufferMinutes: 15,
});

const baseStudio = () => ({
  name: "Lumen Studio",
  ownerId: uid(),
  representative: "Trần B",
  email: "contact@lumen.vn",
  phone: "0911223344",
  address: "Đà Nẵng",
  spacePhotos: ["media/space1.jpg"],
  status: "ACTIVE",
  needsMoreInfo: false,
  scheduling: baseScheduling(),
  // G5: studio ACTIVE hợp lệ phải có banking đủ 4 trường tối thiểu.
  // (Không in/log số tài khoản — dùng mã ẩn danh, A1/không tiết lộ dữ liệu.)
  banking: {
    bankName: "Test Bank",
    accountHolder: "Lumen Studio",
    accountNumber: "0000000000",
    qrImageURI: "media/qr-test.png",
  },
  commissionSettings: { ratePercent: 5, published: true },
});

// ---------------------------------------------------------------------------
console.log("\n[1] Collection mapping (2A.4 CN1 — không dựa pluralize/lowercase mặc định):");
check("User.collection === 'users'", User.collection.name === "users");
check("Studio.collection === 'studios'", Studio.collection.name === "studios");
check("StudioMember.collection === 'studioMembers'", StudioMember.collection.name === "studioMembers");
check("Room.collection === 'rooms'", Room.collection.name === "rooms");
check("Service.collection === 'services'", Service.collection.name === "services");
check(
  "AvailabilityException.collection === 'availabilityExceptions'",
  AvailabilityException.collection.name === "availabilityExceptions"
);

console.log("\n[2] Schema paths chính:");
// Path có thể là leaf trực tiếp (paths['email']) hoặc subdocument/nested
// (paths['scheduling.*'], 'banking.*') — tìm bằng prefix.
function hasPath(M, p) {
  const keys = Object.keys(M.schema.paths || {});
  return keys.includes(p) || keys.some((k) => k.startsWith(p + "."));
}
for (const [M, paths] of [
  [User, ["name", "email", "phone", "passwordHash", "role", "status", "emailVerifiedAt", "createdAt"]],
  [Studio, ["name", "ownerId", "representative", "email", "phone", "address", "spacePhotos", "verificationDocs", "businessLicense", "status", "needsMoreInfo", "approvedAt", "approvedBy", "scheduling", "banking", "commissionSettings"]],
  [StudioMember, ["studioId", "userId", "role", "status"]],
  [Room, ["studioId", "name", "capacity", "amenities", "images", "status"]],
  [Service, ["studioId", "name", "pricingMode", "price", "durationMinutes", "includesRoom", "overagePer30Min", "conditions", "status"]],
  [AvailabilityException, ["studioId", "roomId", "scope", "startAt", "endAt", "type", "reason"]],
]) {
  for (const p of paths) check(`${M.modelName} có path '${p}'`, hasPath(M, p));
}

console.log("\n[3] Index đã khai báo (chưa thực thi trên Atlas — rule C):");
function indexesOf(M) {
  // Gộp index khai báo trên schema + index đặt trong các trường (index: true).
  const out = [];
  const seen = new Set();
  for (const [spec, o] of M.schema.indexes()) {
    const key = JSON.stringify([spec, o]);
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ spec, o });
    }
  }
  for (const [pathName, def] of Object.entries(M.schema.tree)) {
    const opts =
      def && typeof def === "object" && "index" in def ? def : null;
    if (opts?.index) {
      const o = { unique: !!opts.unique, ...opts.partialFilterExpression };
      out.push({ spec: { [pathName]: 1 }, o: o.unique ? { unique: true, ...opts.partialFilterExpression } : opts.partialFilterExpression ? { partialFilterExpression: opts.partialFilterExpression } : {} });
    }
  }
  return out;
}

function describe(M) {
  return indexesOf(M)
    .map(({ spec, o }) =>
      JSON.stringify(spec) +
      (o?.unique ? " [unique]" : "") +
      (o?.partialFilterExpression ? " [partial:" + JSON.stringify(o.partialFilterExpression) + "]" : "")
    )
    .join("; ");
}

console.log("  users :", describe(User));
console.log("  studios:", describe(Studio));
console.log("  studioMembers :", describe(StudioMember));
console.log("  rooms :", describe(Room));
console.log("  services :", describe(Service));
console.log("  availabilityExceptions :", describe(AvailabilityException));

function hasIndex(M, spec, o) {
  const s = JSON.stringify(spec);
  return indexesOf(M).some(({ spec: sp, o: oo }) => {
    if (JSON.stringify(sp) !== s) return false;
    if (o?.unique && !oo?.unique) return false;
    if (o?.partialFilterExpression && JSON.stringify(oo?.partialFilterExpression) !== JSON.stringify(o.partialFilterExpression)) return false;
    return true;
  });
}

check("users.email unique", hasIndex(User, { email: 1 }, { unique: true }));
check("studios {status,needsMoreInfo}", hasIndex(Studio, { status: 1, needsMoreInfo: 1 }, {}));
check("studioMembers {studioId,userId} unique", hasIndex(StudioMember, { studioId: 1, userId: 1 }, { unique: true }));
check("rooms {studioId,status}", hasIndex(Room, { studioId: 1, status: 1 }, {}));
check("services {studioId,status,pricingMode}", hasIndex(Service, { studioId: 1, status: 1, pricingMode: 1 }, {}));
check(
  "availabilityExceptions {studioId,scope,startAt,endAt}",
  hasIndex(AvailabilityException, { studioId: 1, scope: 1, startAt: 1, endAt: 1 }, {})
);
check(
  "availabilityExceptions {roomId} partial scope=ROOM",
  hasIndex(AvailabilityException, { roomId: 1 }, { partialFilterExpression: { scope: "ROOM" } })
);

// ---------------------------------------------------------------------------
console.log("\n[4] Validation — HỢP LỆ:");
await (async () => {
  const u = new User(baseUser());
  await expectValid("User hợp lệ", u);
  check("User.email chuẩn hóa lowercase", u.email === "a@example.com");
  // timestamps:true tạo createdAt/updatedAt khi save() (không test ở bước
  // validate để không chạm DB). Kiểm tra bằng: option bật + path tồn tại.
  check("User.schema.timestamps đã bật", User.schema.options.timestamps === true);
  check("User có paths createdAt/updatedAt", hasPath(User, "createdAt") && hasPath(User, "updatedAt"));
  check("Studio.schema.timestamps đã bật", Studio.schema.options.timestamps === true);

  const s = new Studio(baseStudio());
  await expectValid("Studio hợp lệ", s);

  const m = new StudioMember({ studioId: uid(), userId: uid(), role: "STAFF", status: "ACTIVE" });
  await expectValid("StudioMember hợp lệ", m);

  const r = new Room({ studioId: uid(), name: "Phòng A", capacity: 4, amenities: ["mirror"], images: ["i.jpg"], status: "ACTIVE" });
  await expectValid("Room hợp lệ", r);

  const sv = new Service({ studioId: uid(), name: "Gói 2h", pricingMode: "PACKAGE", price: 600000, includesRoom: true, status: "ACTIVE" });
  await expectValid("Service PACKAGE hợp lệ", sv);

  const svB = new Service({ studioId: uid(), name: "Khối 90p", pricingMode: "BLOCK", price: 300000, durationMinutes: 90, includesRoom: false, status: "ACTIVE" });
  await expectValid("Service BLOCK (duration 90) hợp lệ", svB);

  const a = new AvailabilityException({
    studioId: uid(),
    scope: "STUDIO",
    startAt: now,
    endAt: new Date(now.getTime() + 3600e3),
    type: "CLOSED",
    reason: "Nghỉ lễ",
  });
  await expectValid("AvailabilityException STUDIO/CLOSED hợp lệ", a);
})();

console.log("\n[5] Validation — KHÔNG HỢP LỆ:");
await (async () => {
  await expectInvalid("User: email sai", new User({ ...baseUser(), email: "not-an-email" }), /email/);
  await expectInvalid("User: role ngoài enum", new User({ ...baseUser(), role: "HACKER" }), /role|enum/);
  await expectInvalid("User: thiếu passwordHash", new User({ ...baseUser(), passwordHash: undefined }), /passwordHash|required/);

  const sBadEmail = new Studio({ ...baseStudio(), email: "bad" });
  await expectInvalid("Studio: email sai", sBadEmail, /email/);
  const sBadStatus = new Studio({ ...baseStudio(), status: "PENDING" });
  await expectInvalid("Studio: status ngoài 5 giá trị A7", sBadStatus, /status|enum/);
  const sWeekday = new Studio(baseStudio());
  sWeekday.scheduling.weekdays[0].weekday = 8; // ngoài ISO 1..7
  await expectInvalid("Studio: weekday = 8 (ngoài ISO 1–7)", sWeekday, /weekday/);
  const sBuffer = new Studio(baseStudio());
  sBuffer.scheduling.bufferMinutes = 20; // không thuộc {0,15,30} (M5)
  await expectInvalid("Studio: bufferMinutes = 20 (M5)", sBuffer, /bufferMinutes|enum/);
  const sOCDay = new Studio(baseStudio());
  sOCDay.scheduling.weekdays[0].openMinutes = 1020; // open > close
  await expectInvalid("Studio: weekdays open > close", sOCDay, /openMinutes|weekdays/);

  await expectInvalid(
    "StudioMember: role ngoài enum",
    new StudioMember({ studioId: uid(), userId: uid(), role: "ADMIN", status: "ACTIVE" }),
    /role|enum/
  );

  await expectInvalid(
    "Service: price âm (A1)",
    new Service({ studioId: uid(), name: "X", pricingMode: "HOURLY", price: -1000, includesRoom: false, status: "ACTIVE" }),
    /price|không âm|min/
  );
  await expectInvalid(
    "Service: price không phải số nguyên (A1)",
    new Service({ studioId: uid(), name: "X", pricingMode: "HOURLY", price: 1000.5, includesRoom: false, status: "ACTIVE" }),
    /price/
  );
  await expectInvalid(
    "Service: BLOCK thiếu durationMinutes",
    new Service({ studioId: uid(), name: "Y", pricingMode: "BLOCK", price: 100000, includesRoom: false, status: "ACTIVE" }),
    /BLOCK|durationMinutes/
  );
  await expectInvalid(
    "Service: durationMinutes = 45 (không bước 30)",
    new Service({ studioId: uid(), name: "Z", pricingMode: "BLOCK", price: 100000, durationMinutes: 45, includesRoom: false, status: "ACTIVE" }),
    /durationMinutes/
  );
  await expectInvalid(
    "Service: overagePer30Min âm (A1)",
    new Service({ studioId: uid(), name: "W", pricingMode: "HOURLY", price: 100000, overagePer30Min: -5, includesRoom: false, status: "ACTIVE" }),
    /overagePer30Min/
  );

  await expectInvalid(
    "AvailabilityException: ROOM thiếu roomId",
    new AvailabilityException({ studioId: uid(), scope: "ROOM", startAt: now, endAt: new Date(now.getTime() + 3600e3), type: "EXTENDED", reason: "Mở thêm chiều tối" }),
    /roomId/
  );
  await expectInvalid(
    "AvailabilityException: STUDIO mà có roomId",
    new AvailabilityException({ studioId: uid(), roomId: uid(), scope: "STUDIO", startAt: now, endAt: new Date(now.getTime() + 3600e3), type: "CLOSED", reason: "x" }),
    /STUDIO/
  );
  await expectInvalid(
    "AvailabilityException: startAt >= endAt",
    new AvailabilityException({ studioId: uid(), scope: "STUDIO", startAt: new Date(now.getTime() + 7200e3), endAt: now, type: "BLOCKED", reason: "x" }),
    /endAt|sớm hơn/
  );
  await expectInvalid(
    "AvailabilityException: type ngoài enum",
    new AvailabilityException({ studioId: uid(), scope: "STUDIO", startAt: now, endAt: new Date(now.getTime() + 3600e3), type: "VACATION", reason: "x" }),
    /type|enum/
  );
})();

// ---------------------------------------------------------------------------
// [6] Giai đoạn 2B.1a — cross-field Studio (G1–G5) + Room.capacity.
// Chạy bằng $validate() (hook pre-validate + sub-schema hooks), không validateSync().
function studioSched(patch) {
  const s = baseScheduling();
  for (const [k, v] of Object.entries(patch)) s[k] = v;
  return s;
}

console.log("\n[6] Cross-field Studio (G1–G5) + Room.capacity (2B.1a):");
await (async () => {
  // --- G3: weekday phải nguyên 1–7 ---
  await expectInvalid(
    "G3: weekday = 1.5 bị từ chối",
    new Studio({ ...baseStudio(), scheduling: studioSched({ weekdays: [{ weekday: 1.5, openMinutes: 540, closeMinutes: 780 }] }) }),
    /weekday|ISO/
  );
  await expectInvalid(
    "G3: weekday = 0 bị từ chối",
    new Studio({ ...baseStudio(), scheduling: studioSched({ weekdays: [{ weekday: 0, openMinutes: 540, closeMinutes: 780 }] }) }),
    /weekday/
  );
  await expectInvalid(
    "G3: weekday = 8 bị từ chối",
    new Studio({ ...baseStudio(), scheduling: studioSched({ weekdays: [{ weekday: 8, openMinutes: 540, closeMinutes: 780 }] }) }),
    /weekday/
  );

  // --- G2: trùng weekday (design: 1 khung giờ/ngày) ---
  await expectInvalid(
    "G2: weekdays trùng (2 entry weekday=1) bị từ chối",
    new Studio({
      ...baseStudio(),
      scheduling: studioSched({
        weekdays: [
          { weekday: 1, openMinutes: 540, closeMinutes: 780 },
          { weekday: 1, openMinutes: 900, closeMinutes: 1020 },
        ],
      }),
    }),
    /DUY NHẤT|trùng/
  );

  // --- G1: min <= max duration ---
  await expectInvalid(
    "G1: minDuration > maxDuration bị từ chối",
    new Studio({ ...baseStudio(), scheduling: studioSched({ minDurationMinutes: 90, maxDurationMinutes: 30 }) }),
    /minDuration|G1/
  );
  await expectValid(
    "G1: minDuration = maxDuration (bội 30) hợp lệ",
    new Studio({ ...baseStudio(), scheduling: studioSched({ minDurationMinutes: 120, maxDurationMinutes: 120 }) })
  );

  // --- G4: open/close minutes ---
  await expectInvalid(
    "G4: openMinutes âm bị từ chối",
    new Studio({ ...baseStudio(), scheduling: studioSched({ weekdays: [{ weekday: 1, openMinutes: -30, closeMinutes: 780 }] }) }),
    /openMinutes|0–1440/
  );
  await expectInvalid(
    "G4: closeMinutes = 2000 (>1440) bị từ chối",
    new Studio({ ...baseStudio(), scheduling: studioSched({ weekdays: [{ weekday: 1, openMinutes: 540, closeMinutes: 2000 }] }) }),
    /closeMinutes|0–1440/
  );
  await expectInvalid(
    "G4: openMinutes = 540.5 (thập phân) bị từ chối",
    new Studio({ ...baseStudio(), scheduling: studioSched({ weekdays: [{ weekday: 1, openMinutes: 540.5, closeMinutes: 780 }] }) }),
    /nguyên|openMinutes/
  );
  await expectInvalid(
    "G4: closeMinutes = 779.5 (thập phân) bị từ chối",
    new Studio({ ...baseStudio(), scheduling: studioSched({ weekdays: [{ weekday: 1, openMinutes: 540, closeMinutes: 779.5 }] }) }),
    /nguyên|closeMinutes/
  );
  await expectValid(
    "G4: closeMinutes = 1440 (24:00) hợp lệ khi open < 1440",
    new Studio({ ...baseStudio(), scheduling: studioSched({ weekdays: [{ weekday: 1, openMinutes: 540, closeMinutes: 1440 }] }) })
  );

  // --- G5: banking theo status ---
  await expectValid(
    "G5: PENDING_REVIEW không có banking vẫn hợp lệ",
    new Studio({ ...baseStudio(), status: "PENDING_REVIEW", banking: undefined })
  );
  await expectInvalid(
    "G5: ACTIVE không có banking bị từ chối",
    new Studio({ ...baseStudio(), banking: undefined }),
    /ACTIVE|banking/
  );
  await expectInvalid(
    "G5: ACTIVE thiếu qrImageURI bị từ chối",
    new Studio({ ...baseStudio(), banking: { bankName: "B", accountHolder: "A", accountNumber: "0000000000" } }),
    /ACTIVE|banking/
  );
  await expectValid(
    "G5: ACTIVE với banking đủ 4 trường hợp lệ",
    new Studio(baseStudio())
  );
  // Trường hợp chuyển trạng thái: PENDING_REVIEW (không banking) -> ACTIVE.
  const t = new Studio({ ...baseStudio(), status: "PENDING_REVIEW", banking: undefined });
  await expectValid("G5 (transition): PENDING_REVIEW ban đầu hợp lệ", t);
  t.status = "ACTIVE";
  await expectInvalid(
    "G5 (transition): PENDING_REVIEW -> ACTIVE khi thiếu banking bị từ chối",
    t,
    /ACTIVE|banking/
  );

  // --- Room.capacity (số nguyên dương) ---
  const mkRoom = (cap) => ({ studioId: uid(), name: "Phòng A", status: "ACTIVE", capacity: cap });
  await expectInvalid("capacity = 2.5 bị từ chối", new Room(mkRoom(2.5)), /capacity/);
  await expectInvalid("capacity = 0 bị từ chối", new Room(mkRoom(0)), /capacity|minimum/);
  await expectInvalid("capacity = -1 bị từ chối", new Room(mkRoom(-1)), /capacity|minimum/);
  await expectValid("capacity = 2 hợp lệ", new Room(mkRoom(2)));
  await expectValid("capacity = 1 hợp lệ", new Room(mkRoom(1)));
  await expectValid("capacity = undefined (tùy chọn) hợp lệ", new Room(mkRoom(undefined)));
})();

// ---------------------------------------------------------------------------
console.log(`\nKết quả: ${passed} passed, ${failed} failed.`);
if (failures.length) {
  console.log("Thất bại:\n  " + failures.join("\n  "));
  process.exitCode = 1;
} else {
  console.log("Tất cả kiểm tra hợp lệ/không hợp lệ đạt — models sẵn sàng (index chỉ khai báo, chưa tạo trên Atlas).");
}
// KHÔNG gọi mongoose.connect/disconnect — không có kết nối nào được mở.
