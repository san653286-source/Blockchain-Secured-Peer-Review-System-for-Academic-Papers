import { describe, it, expect, beforeEach } from "vitest";
import { stringAsciiCV, stringUtf8CV, uintCV, bufferCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_ALREADY_SUBMITTED = 101;
const ERR_INSUFFICIENT_STAKE = 102;
const ERR_INVALID_HASH = 103;
const ERR_INVALID_TITLE = 104;
const ERR_INVALID_ABSTRACT = 105;
const ERR_INVALID_SUBMISSION_ID = 106;
const ERR_INVALID_STATUS = 107;

interface Submission {
  author: string;
  paperHash: Buffer;
  title: string;
  abstract: string;
  timestamp: number;
  stakeAmount: number;
  status: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class PaperSubmissionMock {
  state: {
    submissionCounter: number;
    minimumStake: number;
    maxSubmissions: number;
    submissions: Map<number, Submission>;
  } = {
    submissionCounter: 0,
    minimumStake: 1000000,
    maxSubmissions: 10000,
    submissions: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  stxTransfers: Array<{ amount: number; from: string; to: string }> = [];
  userRegistry: Set<string> = new Set(["ST1TEST"]);
  plagiarismCheck: boolean = true;
  reviewerAssignment: boolean = true;

  reset() {
    this.state = {
      submissionCounter: 0,
      minimumStake: 1000000,
      maxSubmissions: 10000,
      submissions: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.stxTransfers = [];
    this.userRegistry = new Set(["ST1TEST"]);
    this.plagiarismCheck = true;
    this.reviewerAssignment = true;
  }

  getSubmission(submissionId: number): Submission | null {
    return this.state.submissions.get(submissionId) || null;
  }

  getSubmissionCount(): Result<number> {
    return { ok: true, value: this.state.submissionCounter };
  }

  getMinimumStake(): Result<number> {
    return { ok: true, value: this.state.minimumStake };
  }

  submitPaper(paperHash: Buffer, title: string, abstract: string): Result<number> {
    if (this.state.submissionCounter >= this.state.maxSubmissions) return { ok: false, value: ERR_INVALID_SUBMISSION_ID };
    if (!this.userRegistry.has(this.caller)) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (paperHash.length === 0) return { ok: false, value: ERR_INVALID_HASH };
    if (title.length === 0 || title.length > 256) return { ok: false, value: ERR_INVALID_TITLE };
    if (abstract.length === 0 || abstract.length > 1000) return { ok: false, value: ERR_INVALID_ABSTRACT };
    if (!this.plagiarismCheck) return { ok: false, value: ERR_ALREADY_SUBMITTED };
    this.stxTransfers.push({ amount: this.state.minimumStake, from: this.caller, to: "contract" });
    const submissionId = this.state.submissionCounter;
    this.state.submissions.set(submissionId, {
      author: this.caller,
      paperHash,
      title,
      abstract,
      timestamp: this.blockHeight,
      stakeAmount: this.state.minimumStake,
      status: "pending",
    });
    this.state.submissionCounter++;
    return this.reviewerAssignment ? { ok: true, value: submissionId } : { ok: false, value: ERR_NOT_AUTHORIZED };
  }

  updateStatus(submissionId: number, newStatus: string): Result<boolean> {
    if (this.caller !== "SP000000000000000000002Q6VF78.consensus-voting") return { ok: false, value: false };
    const submission = this.state.submissions.get(submissionId);
    if (!submission) return { ok: false, value: false };
    if (!["pending", "review", "accepted", "rejected"].includes(newStatus)) return { ok: false, value: false };
    this.state.submissions.set(submissionId, { ...submission, status: newStatus });
    return { ok: true, value: true };
  }

  refundStake(submissionId: number): Result<boolean> {
    if (this.caller !== "SP000000000000000000002Q6VF78.consensus-voting") return { ok: false, value: false };
    const submission = this.state.submissions.get(submissionId);
    if (!submission) return { ok: false, value: false };
    if (submission.status !== "rejected") return { ok: false, value: false };
    this.stxTransfers.push({ amount: submission.stakeAmount, from: "contract", to: submission.author });
    this.state.submissions.set(submissionId, { ...submission, stakeAmount: 0 });
    return { ok: true, value: true };
  }
}

describe("PaperSubmission", () => {
  let contract: PaperSubmissionMock;

  beforeEach(() => {
    contract = new PaperSubmissionMock();
    contract.reset();
  });

  it("submits a paper successfully", () => {
    const result = contract.submitPaper(Buffer.from("a".repeat(32)), "Test Paper", "Test Abstract");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    const submission = contract.getSubmission(0);
    expect(submission?.author).toBe("ST1TEST");
    expect(submission?.title).toBe("Test Paper");
    expect(submission?.abstract).toBe("Test Abstract");
    expect(submission?.status).toBe("pending");
    expect(contract.stxTransfers).toEqual([{ amount: 1000000, from: "ST1TEST", to: "contract" }]);
  });

  it("rejects unauthorized user", () => {
    contract.userRegistry = new Set();
    const result = contract.submitPaper(Buffer.from("a".repeat(32)), "Test Paper", "Test Abstract");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects invalid hash", () => {
    const result = contract.submitPaper(Buffer.from(""), "Test Paper", "Test Abstract");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_HASH);
  });

  it("rejects invalid title", () => {
    const result = contract.submitPaper(Buffer.from("a".repeat(32)), "", "Test Abstract");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_TITLE);
  });

  it("rejects plagiarized paper", () => {
    contract.plagiarismCheck = false;
    const result = contract.submitPaper(Buffer.from("a".repeat(32)), "Test Paper", "Test Abstract");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_ALREADY_SUBMITTED);
  });

  it("updates status successfully", () => {
    contract.submitPaper(Buffer.from("a".repeat(32)), "Test Paper", "Test Abstract");
    contract.caller = "SP000000000000000000002Q6VF78.consensus-voting";
    const result = contract.updateStatus(0, "review");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.getSubmission(0)?.status).toBe("review");
  });

  it("refunds stake for rejected paper", () => {
    contract.submitPaper(Buffer.from("a".repeat(32)), "Test Paper", "Test Abstract");
    contract.caller = "SP000000000000000000002Q6VF78.consensus-voting";
    contract.updateStatus(0, "rejected");
    const result = contract.refundStake(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.getSubmission(0)?.stakeAmount).toBe(0);
    expect(contract.stxTransfers[1]).toEqual({ amount: 1000000, from: "contract", to: "ST1TEST" });
  });
});