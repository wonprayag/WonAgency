import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CertificateEntity } from '../database/schemas/index.js';
import QRCode from 'qrcode';

@Injectable()
export class CertificatesService {
  constructor(
    @InjectModel(CertificateEntity.name) private certificateModel: Model<CertificateEntity>,
  ) {}

  async issueCertificate(data: {
    recipientName: string;
    recipientEid: string;
    projectName: string;
    contributionRole: string;
  }) {
    const certNum = `WON-CERT-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const verificationUrl = `https://wonoriginals.agency/verify?cert=${certNum}`;

    const created = await this.certificateModel.create({
      recipientName: data.recipientName.trim(),
      recipientEid: data.recipientEid.trim(),
      projectName: data.projectName.trim(),
      contributionRole: data.contributionRole.trim(),
      issueDate: new Date().toISOString().split('T')[0],
      certificateNumber: certNum,
      qrVerificationUrl: verificationUrl,
    });

    return {
      id: created._id.toString(),
      _id: created._id.toString(),
      recipientName: created.recipientName,
      recipientEid: created.recipientEid,
      projectName: created.projectName,
      contributionRole: created.contributionRole,
      issueDate: created.issueDate,
      certificateNumber: created.certificateNumber,
      qrVerificationUrl: created.qrVerificationUrl,
    };
  }

  async getAll() {
    const list = await this.certificateModel.find().sort({ createdAt: -1 }).exec();
    return list.map((c) => ({
      id: c._id.toString(),
      _id: c._id.toString(),
      recipientName: c.recipientName,
      recipientEid: c.recipientEid,
      projectName: c.projectName,
      contributionRole: c.contributionRole,
      issueDate: c.issueDate,
      certificateNumber: c.certificateNumber,
      qrVerificationUrl: c.qrVerificationUrl,
    }));
  }

  async verify(certNumber: string) {
    const cert = await this.certificateModel.findOne({ certificateNumber: certNumber });
    if (!cert) {
      throw new NotFoundException('Certificate not found');
    }
    const qrDataUrl = await QRCode.toDataURL(cert.qrVerificationUrl);
    return {
      certificate: {
        id: cert._id.toString(),
        _id: cert._id.toString(),
        recipientName: cert.recipientName,
        recipientEid: cert.recipientEid,
        projectName: cert.projectName,
        contributionRole: cert.contributionRole,
        issueDate: cert.issueDate,
        certificateNumber: cert.certificateNumber,
        qrVerificationUrl: cert.qrVerificationUrl,
      },
      qrCodeDataUrl: qrDataUrl,
      verified: true,
    };
  }

  async delete(id: string) {
    const res = await this.certificateModel.findByIdAndDelete(id).exec();
    if (!res) throw new NotFoundException('Certificate not found');
    return { success: true };
  }
}
