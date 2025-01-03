use namada_sdk::borsh::{BorshDeserialize, BorshSerialize};
use namada_sdk::{
    key::common::{PublicKey, Signature},
    tx::{CompressedAuthorization, Section, Signer, Tx},
};
use std::collections::BTreeMap;
use wasm_bindgen::JsError;

#[derive(BorshSerialize, BorshDeserialize)]
#[borsh(crate = "namada_sdk::borsh")]
pub struct SignatureMsg {
    pub pubkey: Vec<u8>,
    pub raw_indices: Vec<u8>,
    pub raw_signature: Vec<u8>,
    pub wrapper_indices: Vec<u8>,
    pub wrapper_signature: Vec<u8>,
}

/// Reconstructs a proto::Section signature using the provided indices to retrieve hashes
/// from Tx
///
/// # Arguments
///
/// * `pubkey` - Public key bytes
/// * `sec_indices` - Indices indicating hash location
/// * `signature` - Signature bytes
/// * `tx` - A proto::Tx
///
/// # Errors
///
/// Returns JsError if the sig_msg can't be deserialized or
/// Rust structs can't be created.
pub fn construct_signature_section(
    pubkey: &[u8],
    sec_indices: &[u8],
    signature: &[u8],
    tx: &Tx,
) -> Result<Section, JsError> {
    let signatures = BTreeMap::from([(0, Signature::try_from_slice(signature)?)]);

    let compressed_signature = CompressedAuthorization {
        targets: sec_indices.to_vec(),
        signer: Signer::PubKeys(vec![PublicKey::try_from_slice(pubkey)?]),
        signatures,
    };

    Ok(Section::Authorization(compressed_signature.expand(tx)))
}
